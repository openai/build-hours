# %%
import pandas as pd
import os
import yaml

run_name = "customer_service_chat_triage_n=100"
df = pd.read_csv("./data/{}.csv".format(run_name))

# Generate promptfoo eval file
n_rows = len(df)

output_dict = {
    "description": run_name,
    "prompts": ["../prompts/verbatim_input.txt", "../prompts/cot3.json"],
    "providers": [
        "openai:chat:gpt-3.5-turbo",
        "openai:chat:gpt-4o-mini",
        "openai:chat:gpt-4o",
    ],
    "tests": [
        {
            "vars": {"input": row["prompt"], "target": row["correct_output"]},
            "assert": [
                {"type": "python", "value": "file://../py/assert_last_line_answer.py"}
            ],
        }
        for _, row in df[:n_rows].iterrows()
    ],
}

os.makedirs("./evals", exist_ok=True)

with open("./evals/{}.yaml".format(run_name), "w") as file:
    yaml.dump(output_dict, file, default_flow_style=False)
    print(
        "Generated {} promptfoo tests and saved to {}".format(
            n_rows, "{}.yaml".format(run_name)
        )
    )
