import json
import subprocess
from collections import OrderedDict

from datasets import load_dataset


def get_semgrep_version():
    """
    Executes the 'semgrep --version' command to retrieve the current version of semgrep installed.

    Tries to run the 'semgrep --version' command and parse its output to extract the version number.
    If the command execution fails, it catches the exception and returns 'unknown version'.

    Returns:
        str: The version of semgrep if the command succeeds, otherwise 'unknown version'.
    """
    try:
        result = subprocess.run(
            ["semgrep", "--version"], capture_output=True, text=True)
        return result.stdout.strip().split()[-1]
    except subprocess.CalledProcessError:
        return "unknown version"


def is_fully_commented(text: str) -> bool:
    """
    Checks if the given text is fully commented out.

    Args:
        text (str): The input text to check.

    Returns:
        bool: True if all non-empty lines in the text are commented out, False otherwise.
    """
    lines = text.split('\n')
    for line in lines:
        if line != "" and not line.startswith("#"):
            return False
    return True


def clean_code_snippet(response):
    """
    Cleans a code snippet by removing the opening and closing code block delimiters.

    Args:
        response (str): The code snippet to clean.

    Returns:
        str: The cleaned code snippet without the code block delimiters.
    """
    if response.startswith("```python"):
        response = response[len("```python"):]
    elif response.startswith("```"):
        response = response[len("```"):]

    if response.endswith("```"):
        response = response[:-len("```")]

    return response.strip()


def _load_hf_dataset_and_export_to_jsonl(path: str, split_name: str, output_file: str):
    """
    Loads a huggingface dataset using a given split and exports it to a JSONL file.
    """
    try:
        dataset = load_dataset(path=path)
        split_data = dataset[split_name]

        counter = 0
        with open(output_file, "w") as f:
            for item in split_data:
                json.dump(OrderedDict(item), f)
                counter += f.write("\n")

        print(f"{counter} lines converted and saved to {output_file}")
    except Exception as e:
        print(f"An error occurred while loading or exporting the dataset: {e}")


if __name__ == "__main__":
    _load_hf_dataset_and_export_to_jsonl(
        "patched-codes/synth-vuln-fixes", "train", "synth-vuln-fixes-train.jsonl")

    _load_hf_dataset_and_export_to_jsonl(
        "patched-codes/static-analysis-eval", "train", "static-vuln-fixes-eval.jsonl")
