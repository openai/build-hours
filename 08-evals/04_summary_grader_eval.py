# %%
from openai import OpenAI
import pandas as pd

client = OpenAI()

df = pd.read_csv("./data/reviewed_summary_grader_outputs_n=12.csv")

df.head()

tests = []

for idx, row in df.iterrows():
    tests.append(
        {
            "description": "Test if summary is correct",
            "vars": {
                "input": row["input"],
            },
            "assert": [
                {
                    "type": "python",
                    "metric": "frac_key_points_in_summary",
                    "value": f"'{row['ratio_points_in_summary_vs_key_points_total']}' in output.split('\\n')[-1]",
                },
            ],
        }
    )


# Add prompts
prompts = [
    """Evaluate whether the items in summary_key_points are covered in the summary, both provided in <context> tags. Use a full point (1) for a strong match and a half point (0.5) for a partial match. If there are no points in summary_key_points, then assign a score of 0.0.

<context>
{{input}}
</context>

Think step by step and output the final ratio on a new line at the end of the output, formatted like "Fraction: 0.25", with no additional markdown or ``` characters.
""",
]

providers = [
    {
        "id": "openai:gpt-3.5-turbo",
    },
    {
        "id": "openai:gpt-4o-mini",
    },
    {
        "id": "openai:gpt-4o-2024-08-06",
    },
    {
        "id": "openai:o1-mini",
    },
    {
        "id": "openai:o1-preview",
    },
]


promptfoo_config = {
    "tests": tests,
    "prompts": prompts,
    "providers": providers,
}

import yaml

output_yaml_path = "./data/pfoo_eval_summary_grader.yaml"

with open(output_yaml_path, "w") as file:
    yaml.dump(promptfoo_config, file)

print(f"promptfoo_config saved to {output_yaml_path}")
