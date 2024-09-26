"""
The main goal is to produce detailed, step-by-step explanations outlining the reasoning process behind identifying and fixing vulnerabilities in code.
"""

import json
from concurrent.futures import ThreadPoolExecutor, as_completed

from openai import OpenAI
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_random_exponential
from tqdm import tqdm

client = OpenAI()

chain_of_thought_prompt_template = """You are an AI assistant specializing in code security analysis.
You will be provided with training data sample containing single vulnerability report, original code, and the corrected code (within the assistant response) that addresses the reported issue.
Your task is to produce a detailed, step-by-step explanation outlining the reasoning process behind identifying and fixing the vulnerability.
Explain how the specific changes in the corrected code remediate the security issue while preserving the original functionality. Your response should be clear, well-structured, and no longer than 500 words.
Do not include any code snippets; focus solely on the analytical explanation of the modifications made. Think step by step.

Here is an example of the training data sample:
{"content": "<VULNERABILITY REPORT, CWE TYPE, ORIGINAL CODE, AND TASK DEFINITION>", "role": "user"}
{"content": "<CORRECTED_CODE>", "role": "assistant"}]}
"""


class ChainOfThoughtResponse(BaseModel):
    """
    Step-by-step reasoning for how the assistant got to the corrected code.
    """
    stepwise_reasoning_corrected_code: str


def clean_training_data_sample(training_data_sample: str) -> str:
    data = json.loads(training_data_sample)
    user_content = data["messages"][1]["content"].replace(
        "Task: Fix the vulnerability in the code above. Provide only the complete fixed code without explanations or comments. Make minimal changes necessary to address the security issue while preserving the original functionality.", ""
    )
    cleaned_data = {
        "user": user_content,
        "assistant": data["messages"][2]["content"]
    }
    return json.dumps(cleaned_data)


@retry(wait=wait_random_exponential(min=20, max=60), stop=stop_after_attempt(3))
def get_cot_response(training_data_sample: str) -> str:
    messages = [
        {"role": "system", "content": chain_of_thought_prompt_template},
        {"role": "user",
            "content": f"Training Data Sample:\n{clean_training_data_sample(training_data_sample)}"},
    ]

    completion = client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=messages,
        temperature=0.2,
        response_format=ChainOfThoughtResponse,
    )
    message = completion.choices[0].message
    if message.parsed:
        return message.parsed.stepwise_reasoning_corrected_code
    else:
        return message.refusal


def process_training_data_sample(training_data_sample: str, func):
    response = func(training_data_sample)
    return response


def process_file(func: callable, file_path: str, samples: int = None, output_file_suffix: str = None, workers: int = 20):
    """
    Processes JSONL line by line using the provided function to augment the training data with CoT
    """
    with open(file_path, 'r') as file:
        if samples is not None:
            lines = [file.readline() for _ in range(samples)]
        else:
            lines = file.readlines()

    new_file_path = f"{file_path.rsplit('.', 1)[0]}-{output_file_suffix}.jsonl"

    updated_lines = []
    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_to_line = {executor.submit(
            process_training_data_sample, line, func): line for line in lines}
        for future in tqdm(as_completed(future_to_line), total=len(lines), desc="Processing lines"):
            response = future.result()
            line = future_to_line[future]
            data = json.loads(line)
            if "messages" in data:
                for i, message in enumerate(data["messages"]):
                    if message["role"] == "assistant":
                        message["content"] = f'# {response.replace(chr(10), " ")}\n' + \
                            message["content"]
                        break
                else:
                    raise ValueError(
                        f"No assistant message found in data: {data}")
            else:
                raise KeyError(f"Key 'messages' not found on line: {line}")
            updated_lines.append(json.dumps(data) + "\n")

    with open(new_file_path, 'w') as new_file:
        new_file.writelines(updated_lines)
        print(f"File written: {new_file.name}")


if __name__ == "__main__":
    process_file(func=get_cot_response,
                 file_path='synth-vuln-fixes-train.jsonl',
                 samples=None,  # Set to None to process all lines
                 output_file_suffix='coft-commments-0822')
