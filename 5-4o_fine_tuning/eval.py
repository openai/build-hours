"""
The training dataset and evaluations used in this script are derived from https://huggingface.co/patched-codes, with acknowledgments to patched.codes (S24) for their contributions.
"""

import argparse
import datetime
import json
import multiprocessing
import os
import re
from functools import partial

import numpy as np
from datasets import load_dataset
from openai import OpenAI
from sentence_transformers import CrossEncoder, SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from tenacity import retry, stop_after_attempt, wait_random_exponential
from tqdm import tqdm
from util import clean_code_snippet, get_semgrep_version, is_fully_commented

client = OpenAI()


def fetch_few_shot_train_examples(prompt: str, num_examples: int = 0, use_similarity: bool = False):
    """
    Fetches few-shot training examples from the "patched-codes/synth-vuln-fixes" dataset based on the given prompt.

    Args:
        prompt (str): The input prompt for which few-shot examples are to be fetched.
        num_examples (int, optional): The number of few-shot examples to fetch. Defaults to 0.
        use_similarity (bool, optional): If True, uses a similarity-based approach to fetch examples. Defaults to False.

    Returns:
        list: A list of few-shot training examples in the form of dialogue messages.

    The function operates in two modes:
    1. Random Selection: If use_similarity is False, it randomly selects num_examples from the dataset.
    2. Similarity-based Selection: If use_similarity is True, it uses a two-step process:
        a. Initial Retrieval: Uses a lightweight model to encode the prompt and user messages from the dataset,
           and retrieves the top_k most similar examples based on cosine similarity.
        b. Reranking: Uses a cross-encoder model to rerank the initially retrieved examples and selects the top num_examples.

    The function returns a list of few-shot training examples, excluding system messages.
    """
    dataset = load_dataset("patched-codes/synth-vuln-fixes", split="train")
    if use_similarity:
        # lightweight model for initial retrieval
        retrieval_model = SentenceTransformer('all-MiniLM-L6-v2')
        # cross-encoder model for reranking
        rerank_model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        # Extract user messages
        user_messages = [
            next(msg['content']
                 for msg in item['messages'] if msg['role'] == 'user')
            for item in dataset
        ]
        # encode the prompt and user messages for initial retrieval
        prompt_embedding = retrieval_model.encode(
            prompt, convert_to_tensor=False)
        corpus_embeddings = retrieval_model.encode(
            user_messages, convert_to_tensor=False, show_progress_bar=True)

        similarities = cosine_similarity(
            [prompt_embedding], corpus_embeddings)[0]
        top_k = min(100, len(dataset))
        top_indices = similarities.argsort()[-top_k:][::-1]

        # reranking
        rerank_pairs = [[prompt, user_messages[idx]] for idx in top_indices]

        # rerank using the cross-encoder model
        rerank_scores = rerank_model.predict(rerank_pairs)

        # Select top num_examples based on rerank scores
        reranked_indices = [top_indices[i]
                            for i in np.argsort(rerank_scores)[::-1][:num_examples]]
        top_indices = reranked_indices
    else:
        top_indices = np.random.choice(
            len(dataset), num_examples, replace=False)

    few_shot_messages = []
    for index in top_indices:
        py_index = int(index)
        messages = dataset[py_index]["messages"]

        dialogue = [msg for msg in messages if msg['role'] != 'system']
        few_shot_messages.extend(dialogue)

    return few_shot_messages


def clean_filename(name: str) -> str:
    return re.sub(r'[^a-zA-Z0-9\-_]', '*', name.replace(':', '_'))


@retry(wait=wait_random_exponential(min=20, max=60), stop=stop_after_attempt(3))
def get_fixed_code_fine_tuned(prompt: str,
                              few_shot_messages,
                              model_name: str):
    """
    Generates corrected code for a given piece of code identified with vulnerabilities.

    Steps:
    1. Constructs a system message to set the context for the model.
    2. Compiles messages from both the system and user, including the vulnerability report and original code, along with few-shot examples.
    3. Cleans the corrected code snippet returned from the chat completion response.
    4. Returns the cleaned, corrected code.
    """
    system_message = (
        "You are an AI assistant specialized in fixing code vulnerabilities. "
        "Your task is to provide corrected code that addresses the reported security issue. "
        "Always maintain the original functionality while improving security. "
        "Be precise and make only necessary changes. "
        "Maintain the original code style and formatting unless it directly relates to the vulnerability. "
        "Pay attention to data flow between sources and sinks when provided."
    )
    messages = [
        {"role": "system", "content": system_message},
    ]
    messages.extend(few_shot_messages)
    messages.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(
        model=model_name,
        messages=messages,
        max_tokens=4096,
        temperature=0.2,
        top_p=0.95
    )

    fixed_code = clean_code_snippet(response.choices[0].message.content)
    return fixed_code


def process_file(test_case, fixed_files, model_name: str, n_shot: int, use_similarity: bool):
    """
    Processes a given test case file to identify and fix vulnerabilities using a specified model.

    Steps:
    1. Writes the source code from the test case to a new file in the 'staticeval' directory.
    2. Uses the free version of `semgrep` to scan the newly written file for vulnerabilities.
    3. If vulnerabilities are found, constructs a prompt detailing the vulnerability, optionally fetches few-shot training examples, and calls `get_fixed_code_fine_tuned`.
    4. Writes the returned corrected code to a new file and rescans it with `semgrep` to verify the fix.
    5. Updates the list of fixed files if the fix is successful.

    Args:
        test_case(dict): A dictionary containing the test case details, including 'source' and 'file_name'.
        fixed_files(list): A list to store the names of files that have been successfully fixed.
        model_name(str): The name of the model used for generating fixes.
        n_shot(int): The number of few-shot examples to use.
        use_similarity(bool): A flag to determine if similarity-based retrieval of examples should be used.
    """
    file_text = test_case["source"]
    file_name = test_case["file_name"]
    input_file = os.path.join("staticeval", file_name)

    output_file = f"{input_file}_fixed.py"
    tmp_file = f"{input_file}.output.json"

    try:
        os.makedirs(os.path.dirname(input_file), exist_ok=True)

        with open(input_file, "w") as file_object:
            file_object.write(file_text)

        if os.path.exists(tmp_file):
            os.remove(tmp_file)

        # Scan the file for vulnerabilities
        tqdm.write("Scanning file " + input_file + "...")
        scan_command_input = f"semgrep --config auto {input_file} --output {tmp_file} --json > /dev/null 2>&1"
        os.system(scan_command_input)

        # Check if the scan output file exists
        if not os.path.exists(tmp_file):
            tqdm.write(
                f"Semgrep failed to create output file for {input_file}")
            return False

        # Check if there are any errors or no vulnerabilities
        with open(tmp_file, 'r') as jf:
            data = json.load(jf)

        if len(data.get("errors", [])) > 0:
            tqdm.write(f"Error processing {input_file} ...")
            return False

        if len(data.get("results", [])) == 0:
            tqdm.write(input_file + " has no vulnerabilities")
            result = False

        # handle the case where there are vulnerabilities
        else:
            tqdm.write(f"Vulnerability found in {input_file}...")
            cwe = test_case['cwe']
            lines = data["results"][0]["extra"]["lines"]
            message = data["results"][0]["extra"]["message"]

            prompt = f"""Vulnerability Report:
    - Type: {cwe}
    - Location: {lines}
    - Description: {message}
    Original Code:
    ```
    {file_text}
    ```
    Task: Fix the vulnerability in the code above. Provide only the complete fixed code without explanations or comments. Make minimal changes necessary to address the security issue while preserving the original functionality."""

            few_shot_messages = fetch_few_shot_train_examples(
                prompt=prompt,
                num_examples=n_shot,
                use_similarity=use_similarity)

            fixed_code = get_fixed_code_fine_tuned(
                prompt=prompt,
                few_shot_messages=few_shot_messages,
                model_name=model_name)

            # Check if the fixed code is valid
            if len(fixed_code) < 512 or is_fully_commented(fixed_code):
                result = False
            else:
                # Remove the output file and tmp file if they exist
                if os.path.exists(output_file):
                    os.remove(output_file)
                with open(output_file, 'w') as wf:
                    wf.write(fixed_code)
                if os.path.exists(tmp_file):
                    os.remove(tmp_file)
                scan_command_output = f"semgrep --config auto {output_file} --output {tmp_file} --json > /dev/null 2>&1"
                os.system(scan_command_output)
                with open(tmp_file, 'r') as jf:
                    data = json.load(jf)
                if len(data["results"]) == 0:
                    tqdm.write("Passing response for " +
                               input_file + " at 1 ...")
                    result = True
                    fixed_files.append(file_name)
                else:
                    tqdm.write("Failing response for " +
                               input_file + " at " + str(len(data["results"])))
                    print(data["results"])
                    result = False

        if os.path.exists(tmp_file):
            os.remove(tmp_file)

        return result
    except Exception as e:
        tqdm.write(f"Error processing {input_file}: {str(e)}")
        return False


def create_log_file(log_file_name: str,
                    model_name: str,
                    score: float,
                    passing_tests: int,
                    total_tests: int,
                    fixed_files: list,
                    n_shot: int,
                    use_similarity: bool):
    """
    Creates a log file to record the evaluation results.

    Args:
        log_file_name(str): The name of the log file.
        model_name(str): The name of the model used for evaluation.
        score(float): The evaluation score as a percentage.
        passing_tests(int): The number of tests that passed.
        total_tests(int): The total number of tests conducted.
        fixed_files(list): A list of files that were fixed.
        n_shot(int): The number of few-shot examples used.
        use_similarity(bool): Whether similarity-based retrieval was used for n_shot.
    """
    os.makedirs('logs', exist_ok=True)
    with open(os.path.join('logs', log_file_name), 'w') as log_file:
        log_entries = [
            "Eval Results",
            "--------------------",
            f"Timestamp: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Model: {model_name}",
            f"Score: {score:.2f}%",
            f"Semgrep Version: {get_semgrep_version()}",
            f"Passing Tests: {passing_tests} out of {total_tests}",
            f"Number of few-shot examples: {n_shot}",
            f"Use similarity for examples: {'Yes' if use_similarity else 'No'}",
            "Fixed Files:"
        ]

        log_file.write("\n".join(log_entries) + "\n")
        for file in fixed_files:
            log_file.write(f"- {file}\n")


def main():
    # Parse arguments
    parser = argparse.ArgumentParser(
        description="Run static analysis eval")
    parser.add_argument("--model", type=str,
                        default="gpt-4o-mini",
                        help="OpenAI model name (base or fine-tuned)")

    parser.add_argument("--n_shot", type=int, default=0,
                        help="# of examples for few-shot")

    parser.add_argument("--use_similarity", action="store_true",
                        help="Enable similarity-based retrieval of dataset examples")

    args = parser.parse_args()
    model_name = args.model
    n_shot = args.n_shot
    use_similarity = args.use_similarity

    # Load the eval dataset
    eval_dataset = load_dataset("patched-codes/static-analysis-eval",
                                split="train", download_mode='force_redownload')
    data = [{"file_name": item["file_name"], "source": item["source"],
             "cwe": item["cwe"]} for item in eval_dataset]

    manager = multiprocessing.Manager()
    fixed_files = manager.list()
    process_func = partial(process_file,
                           fixed_files=fixed_files,
                           model_name=model_name,
                           n_shot=n_shot,
                           use_similarity=use_similarity)
    total_tests = len(data)

    # Run the evals in parallel
    with multiprocessing.Pool(processes=max(1, multiprocessing.cpu_count() - 2)) as pool:
        results = list(tqdm(pool.imap(process_func, data), total=total_tests))

    # Aggregate results and log
    passing_tests = sum(results)
    score = passing_tests / total_tests * 100
    sanitized_model_name = f"{clean_filename(model_name)}-{n_shot}-shot" + (
        "-sim" if use_similarity else "")
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M")
    log_file_name = f"{sanitized_model_name}_{timestamp}.log"

    create_log_file(log_file_name=log_file_name, model_name=model_name, score=score,
                    passing_tests=passing_tests,
                    total_tests=total_tests,
                    fixed_files=fixed_files,
                    n_shot=n_shot,
                    use_similarity=use_similarity)

    print(
        f"Results for static analysis eval: {score:.2f}%\nLog file with results: {log_file_name}")


if __name__ == '__main__':
    main()
    # Example usage: python eval.py --model gpt-4o-mini --n_shot 5 --use_similarity
