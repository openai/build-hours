# %%
import pandas as pd
import os
import yaml

# Load the test dataset
df = pd.read_csv("./data/customer_service_chat_triage_n=100_test.csv")

# Generate promptfoo eval file
test_name = "customer_service_chat_triage_ft_n={}".format(len(df))
ft_model_name = "ft:gpt-4o-mini-2024-07-18:openai-internal::9rMH8pFU"

output_dict = {
    "description": test_name,
    "prompts": [
        {
            "id": "../prompts/verbatim_input.txt",
            "label": "verbatim_input",
        },
        {
            "id": "../prompts/cot3.json",
            "label": "cot3",
        },
    ],
    "providers": [
        {
            "id": "openai:chat:gpt-3.5-turbo",
            "prompts": ["verbatim_input", "cot3"],
        },
        {
            "id": "openai:chat:gpt-4o-mini",
            "prompts": ["verbatim_input", "cot3"],
        },
        {
            "id": "openai:chat:gpt-4o",
            "prompts": ["verbatim_input", "cot3"],
        },
        {
            "id": "openai:chat:{}".format(ft_model_name),
            "prompts": ["cot3"],
        },
    ],
    "tests": [
        {
            "vars": {
                "input": row["prompt"],
                "target": row["correct_output"],
            },
            "assert": [
                {
                    "type": "python",
                    "value": "file://../py/assert_last_line_answer.py",
                },
            ],
        }
        for _, row in df.iterrows()
    ],
}

os.makedirs("./evals", exist_ok=True)

with open("./evals/{}.yaml".format(test_name), "w") as file:
    yaml.dump(output_dict, file, default_flow_style=False)
    print("Saved promptfoo file to {}.yaml".format(test_name))
