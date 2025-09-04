# %%
# Create a stanbot eval

import os
import pandas as pd
from openai import OpenAI
import json
import concurrent.futures
from tqdm import tqdm

from utils.constants import prompt_create_eval_dataset

# User input params
example_inputs = """
<example_input_1>
[info] Standup time: 10/02/2024 08:01:00

Noah: Hi everyone! Let's go around with quick updates. I'm ready to a round of testing once everything's on dev!

Shyamal: Good progress but tests aren't passing, the welcome carousel probably will land this afternoon. Also blocked on the backend user creation endpoint being live.

Charu: User creation endpoint is almost ready! Waiting for PR review and then should be good.

Noah: Okay, it sounds like we're a little behind, how are things looking for landing this day after tomorrow on October 23?

Shyamal: Yeah it's probably going to go into next week.

Noah: Okay, Sounds like the onboarding project is now at risk for October 23. Let's do our best to get this out!f
</example_input_1>
"""

task_context = """
- The high-level goal is to create summaries from software engineering standup meetings.
- Input transcripts should have at least 8 back and forths from at least 3 different people
- Transcript style should be casual and in the style of software engineers. Include "ums" and other features of how people tend to talk.
- Approach for making this particular sample more difficult: {{hard_case}}
"""

hard_cases = [
    "1. Project name mentioned clearly",
    "2. Project info mentioned alongside numerous tasks and complex date and status revisions",
    "3. (Negative) project name not mentioned at all",
    "4. (Negative) transcript is unrelated to engineering standup",
    "5. Long transcript with lots of irrelevant information",
    "6. Bad transcript quality",
]

output_columns = """
- project_name: string
- project_target_date: string, like "mm/dd/yyyy"
- project_status: oneof [Complete, At Risk, On Track]
- summary_key_points: string, bulleted list
- summary: string, multiple sentences capturing the key points
"""

client = OpenAI()


# Request sample and parse json
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


# Create n repeats of each case
case_repeats = 3
sample_cases = [case for case in hard_cases for _ in range(case_repeats)]

# Generate samples in parallel
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
filename = "draft_stanbot_outputs_n={}.csv".format(len(results))
os.makedirs(output_dir, exist_ok=True)

pd.DataFrame(results).sort_values(by="new_input_case").to_csv(
    os.path.join(output_dir, filename), index=False
)

# %%
