# %%

import os
import pandas as pd
from openai import OpenAI
import json

from utils.constants import prompt_create_eval_dataset

example_inputs = """
<example_input_1>
<summary_key_points>
- Database migration delayed from the 10th to the 12th.
- Front-end components delayed, expected by tomorrow.
- Logging feature postponed until after launch.
- Omega launch target date moved from 11/15/2024 to 11/18/2024.
- Project considered at risk; team agrees to adjust timeline.
</summary_key_points>
<summary>
During the standup meeting on November 5th, the team discussed delays affecting the Omega launch. The database migration is now expected to complete on the 12th instead of the 10th, impacting integration testing scheduled for the 11th. Front-end components have been delayed but are expected soon. The logging feature has been postponed until after launch. As a result, the team agreed to move the Omega launch target date from November 15th to November 18th, considering the project at risk. They plan to adjust timelines and maintain open communication.
</summary>
</example_input_1>
"""

task_context = """
- The goal is to develop an LLM grader that takes in a set of key points, and a summary, and outputs the fraction of the key points that appear in the summary.
- Mirror the example_input format and use xml tags to delimit the summary_key_points and summary text
- Approach for making this particular sample more difficult: {{hard_case}}
"""

hard_cases = [
    "1. 3-6 key points, accurately captured in summary",
    "2. Summary misses some or all key points",
    "3. 0 items in summary_key_points, but summary present",
    "4. 3-6 items in summary_key_points, with ambiguous or borderline inclusion in the summary",
]

output_columns = """
- key_points_total: number
- key_points_present_in_summary: number (can have half points for borderline cases)
- ratio_points_in_summary_vs_key_points_total: number (0 if key_points_total is 0)
"""

client = OpenAI()


def request_new_sample(
    task_context, case_i, example_inputs, output_columns, model="gpt-4o"
):
    p = (
        prompt_create_eval_dataset.replace("{{task_context}}", task_context)
        .replace("{{new_input_case}}", case_i)
        .replace("{{example_inputs}}", example_inputs)
        .replace("{{output_columns}}", output_columns)
    )

    res = client.chat.completions.create(
        model=model, messages=[{"role": "user", "content": p}]
    )

    try:
        return json.loads(res.choices[0].message.content)
    except json.JSONDecodeError:
        print("ERROR: Invalid JSON for case={}".format(case_i))
        return None


import concurrent.futures
from tqdm import tqdm

case_repeats = 3
sample_cases = [case for case in hard_cases for _ in range(case_repeats)]


with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
    futures = [
        executor.submit(
            request_new_sample,
            task_context,
            case,
            example_inputs,
            output_columns,
            model="o1-preview",
        )
        for case in sample_cases
    ]
    results = []
    for future in tqdm(
        concurrent.futures.as_completed(futures),
        total=len(futures),
        desc="Creating sample data",
    ):
        results.append(future.result())

    # Remove none values from bad json
    results = [result for result in results if result is not None]
    print("created {} sample datapoints".format(len(results)))


# save to csv
output_dir = "./data"
filename = "draft_summary_grader_outputs_n={}.csv".format(len(results))
os.makedirs(output_dir, exist_ok=True)

pd.DataFrame(results).sort_values(by="new_input_case").to_csv(
    os.path.join(output_dir, filename), index=False
)

print("saved to", filename)

# %%
