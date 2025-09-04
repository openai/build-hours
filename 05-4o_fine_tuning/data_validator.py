"""
This module provides a DataValidator class to help validate and analyze JSONL datasets.
It includes methods to check for data overlaps, format errors, and various data statistics.
"""

import json
import logging
import os
import uuid
from collections import defaultdict
from datetime import datetime
from typing import Optional

import numpy as np
import tiktoken
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# init tiktoken encoding
encoding = tiktoken.get_encoding("o200k_base")


class DataValidator(BaseModel):
    train_file: str
    validation_file: Optional[str] = None
    log_file: Optional[str] = None

    def __init__(self, **data):
        super().__init__(**data)
        self.log_file = self.log_file or f"{datetime.now().strftime('%m%d')}-{uuid.uuid4().hex[:8]}-datavalidator.log"
        logs_dir = os.path.join(os.path.dirname(self.train_file), 'logs')
        os.makedirs(logs_dir, exist_ok=True)
        log_file_path = os.path.join(logs_dir, self.log_file)

        file_handler = logging.FileHandler(log_file_path)
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'))
        logger.addHandler(file_handler)
        logger.info(f"Log report will be saved in {log_file_path}")

    def check_data_overlap(self):
        if not self.validation_file:
            logger.info(
                "No validation file provided. Skipping data overlap check.")
            return

        files_to_check = [self.train_file, self.validation_file]
        for file in files_to_check:
            if not file.endswith('.jsonl'):
                raise ValueError(f"Invalid JSONL file: {file}")

        data_sets = {file: {json.dumps(json.loads(
            line.strip()), sort_keys=True) for line in open(file)} for file in files_to_check}
        overlaps = {(file1, file2): len(data_sets[file1] & data_sets[file2]) for i, file1 in enumerate(
            files_to_check) for file2 in files_to_check[i+1:]}

        for (file1, file2), count in overlaps.items():
            logger.info(
                f"Overlap between {file1} and {file2}: {count} records")

        return overlaps

    def check_data_format_errors(self) -> dict:
        """
        Format validation checks:
        - Data Type Check: Checks whether each entry in the dataset is a dictionary (dict). Error type: data_type.
        - Presence of Message List: Checks if a messages list is present in each entry. Error type: missing_messages_list.
        - Message Keys Check: Validates that each message in the messages list contains the keys role and content. Error type: message_missing_key.
        - Unrecognized Keys in Messages: Logs if a message has keys other than role, content, weight, function_call, and name. Error type: message_unrecognized_key.
        - Role Validation: Ensures the role is one of "system", "user", or "assistant". Error type: unrecognized_role.
        - Content Validation: Verifies that content has textual data and is a string. Error type: missing_content.
        - Assistant Message Presence: Checks that each conversation has at least one message from the assistant. Error type: example_missing_assistant_message.

        # Example usage --> errors = check_format_errors(dataset)
        """
        files_to_check = [
            self.train_file, self.validation_file] if self.validation_file else [self.train_file]

        data_format_errors = {file: False for file in files_to_check}

        for dataset_path in files_to_check:
            data_path = dataset_path
            if not data_path.endswith('.jsonl'):
                raise ValueError(
                    f"The provided dataset path `{data_path}` is not a valid JSONL file.")

            # Load dataset
            with open(data_path) as f:
                dataset = [json.loads(line) for line in f]

            logger.info(
                f"Checking format errors in {data_path}")

            # initial dataset stats
            try:
                logger.info(f"Number of examples: {len(dataset)}")
                logger.info("First example:")
                for message in dataset[0]["messages"]:
                    logger.info(message)
            except KeyError:
                logger.error(
                    "\033[91mNo messages found in the first example.\033[0m")

            # Format error checks
            format_errors = defaultdict(int)

            for ex in dataset:
                if not isinstance(ex, dict):
                    format_errors["data_type"] += 1
                    continue

                messages = ex.get("messages", None)
                if not messages:
                    format_errors["missing_messages_list"] += 1
                    continue

                for message in messages:
                    if "role" not in message or "content" not in message:
                        format_errors["message_missing_key"] += 1

                    if any(k not in ("role", "content", "name", "function_call", "weight") for k in message):
                        format_errors["message_unrecognized_key"] += 1

                    if message.get("role", None) not in ("system", "user", "assistant", "function"):
                        format_errors["unrecognized_role"] += 1

                    content = message.get("content", None)
                    function_call = message.get("function_call", None)

                    if (not content and not function_call) or not isinstance(content, str):
                        format_errors["missing_content"] += 1

                if not any(message.get("role", None) == "assistant" for message in messages):
                    format_errors["example_missing_assistant_message"] += 1

            if format_errors:
                data_format_errors[data_path] = True
                logger.error(f"\033[91mFound errors in {data_path}:\033[0m")
                for k, v in format_errors.items():
                    logger.error(f"\033[91m  {k}: {v}\033[0m")
            else:
                logger.info(f"\033[92mNo errors found for {data_path}\033[0m")
            logger.info("-----------------------------------")
        return data_format_errors

    def check_train_data_stats(self):
        """
        Data warnings and token counts:
        - Missing System/User Messages: Counts the number of conversations missing a "system" or "user" message. Such messages are critical for defining the assistant's behavior and initiating the conversation.
        - Number of Messages Per Example: Summarizes the distribution of the number of messages in each conversation, providing insight into dialogue complexity.
        - Total Tokens Per Example: Calculates and summarizes the distribution of the total number of tokens in each conversation. Important for understanding fine-tuning costs.
        - Tokens in Assistant's Messages: Calculates the number of tokens in the assistant's messages per conversation and summarizes this distribution. Useful for understanding the assistant's verbosity.
        """
        data_path = self.train_file
        if not data_path.endswith('.jsonl'):
            raise ValueError(f"Invalid JSONL file: `{data_path}`")

        with open(data_path) as f:
            dataset = [json.loads(line) for line in f]

        logger.info(f"Checking data stats in {data_path}")

        def num_tokens_from_messages(messages, tokens_per_message=3, tokens_per_name=1):
            return sum(tokens_per_message + sum(len(encoding.encode(value)) + (tokens_per_name if key == "name" else 0) for key, value in message.items()) for message in messages) + 3

        def num_assistant_tokens_from_messages(messages):
            return sum(len(encoding.encode(message["content"])) for message in messages if message["role"] == "assistant")

        def print_distribution(values, name):
            logger.info(f"\n#### Distribution of {name}:")
            logger.info(f"  min / max: {min(values)}, {max(values)}")
            logger.info(
                f"  mean / median: {np.mean(values)}, {np.median(values)}")
            logger.info(
                f"  p5 / p95: {np.quantile(values, 0.1)}, {np.quantile(values, 0.9)}")

        n_missing_system = sum(1 for ex in dataset if not any(
            message["role"] == "system" for message in ex["messages"]))
        n_missing_user = sum(1 for ex in dataset if not any(
            message["role"] == "user" for message in ex["messages"]))
        n_messages = [len(ex["messages"]) for ex in dataset]
        convo_lens = [num_tokens_from_messages(
            ex["messages"]) for ex in dataset]
        assistant_message_lens = [num_assistant_tokens_from_messages(
            ex["messages"]) for ex in dataset]

        logger.info(
            f"\n\033[94mNum examples missing system message:\033[0m\n{n_missing_system}")
        logger.info(
            f"\n\033[94mNum examples missing user message:\033[0m\n{n_missing_user}")
        print_distribution(
            n_messages, "\033[92mnum_messages_per_example\033[0m")
        print_distribution(
            convo_lens, "\033[92mnum_total_tokens_per_example\033[0m")
        print_distribution(assistant_message_lens,
                           "\033[92mnum_assistant_tokens_per_example\033[0m")


if __name__ == "__main__":
    # example usage
    dv = DataValidator(
        train_file="synth-vuln-fixes-train.jsonl")
    dv.check_data_overlap()
    data_format_errors = dv.check_data_format_errors()
    dv.check_train_data_stats()
    pass
