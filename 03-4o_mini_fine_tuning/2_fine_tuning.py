# %%
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor
from openai import OpenAI
import pandas as pd
import json
import random

random.seed(42)

client = OpenAI()

FT_MODEL = "gpt-4o-mini-2024-07-18"
run_name = "customer_service_chat_triage_n=100"
df = pd.read_csv("./data/{}.csv".format(run_name))
classes = df["correct_output"].unique().tolist()

df.head()

# %%
# Split into train and test. Save indices to get the same splits below
indices = df.index.tolist()
random.shuffle(indices)

train_indices, test_indices = (
    indices[: int(len(df) * 0.7)],
    indices[int(len(df) * 0.7):],
)

df.loc[train_indices].to_csv(
    "./data/{}.csv".format(run_name + "_train"),
    index=False,
)
df.loc[test_indices].to_csv(
    "./data/{}.csv".format(run_name + "_test"), index=False)

print(
    f"Number of training samples: {len(train_indices)}, Number of testing samples: {len(test_indices)}"
)

# %%
# Do simple CoT, with the input reasoning and the correct answer
sys_cot = """You are an expert at developing logical, rigorous reasoning to classify the intent of a customer service ticket. Think step by step and analyze the task before providing your final answer. The final answer must be rendered on the last output line, with no additional quotes, xml tags, or empty newlines.

In your analysis, perform the following steps:
1. Analyze the content of the chat to determine the primary issue
2. Extract key phrases and concepts, and explain how they could help make the correct classification
3. Consider each of the provided categories and identify the potential for each, with a confidence (1-10)
4. Highlight ambiguity or limitations
5. Synthesize your findings and create a final rationale
6. Output the final answer in the final line. Do not output any empty newlines or markdown ` characters.
"""

sys_addendum_with_answer = """
Note that you are also provided with the correct output in <correct_output> tags and the suggested reasoning in <initial_reasoning> tags. Please use this information to help you think step by step about the provided task. You must arrive at the answer in <correct_output>.

<initial_reasoning>
{{initial_reasoning}}
</initial_reasoning>

<correct_output>
{{correct_output}}
</correct_output>
"""

# %%
# Make reasoning traces
messages_bw_reasoning = []
for idx, row in df.iterrows():
    sys_msg_i = sys_cot + sys_addendum_with_answer.replace(
        "{{initial_reasoning}}", row["reasoning"]
    ).replace("{{correct_output}}", row["correct_output"])
    messages_bw_reasoning.append(
        [
            {
                "role": "system",
                "content": sys_msg_i,
            },
            {"role": "user", "content": row["prompt"]},
        ]
    )

# get completions from gpt-4o


def process_message(msg):
    res = client.chat.completions.create(model="gpt-4o", messages=msg)
    msg.append(
        {"role": "assistant", "content": res.choices[0].message.content})
    return msg


with ThreadPoolExecutor() as executor:
    messages_bw_reasoning = list(
        tqdm(
            executor.map(process_message, messages_bw_reasoning),
            total=len(messages_bw_reasoning),
        )
    )

# %%
# Split the results into train and test sets
train_results = [messages_bw_reasoning[i] for i in train_indices]
test_results = [messages_bw_reasoning[i] for i in test_indices]

# Save the train results to a JSONL file
train_file_path = "./data/{}_train.jsonl".format(run_name)
test_file_path = "./data/{}_test.jsonl".format(run_name)

with open(train_file_path, "w") as f:
    for result in train_results:
        json.dump({"messages": result}, f)
        f.write("\n")

# Save the test results to a JSONL file
with open(test_file_path, "w") as f:
    for result in test_results:
        json.dump({"messages": result}, f)
        f.write("\n")

# %%
# Upload the results file to OpenAI and kick off a fine-tuning job
file_resp_train = client.files.create(
    file=open(train_file_path, "rb"), purpose="fine-tune"
)

file_resp_test = client.files.create(
    file=open(test_file_path, "rb"), purpose="fine-tune"
)

fine_tune_response = client.fine_tuning.jobs.create(
    training_file=file_resp_train.id,
    model=FT_MODEL,
    validation_file=file_resp_test.id,
)

print(f"Fine-tuning job started for {run_name}: {fine_tune_response.id}")

# %%
# Save CoT prompt for future evaluation
cot3 = [
    {
        "role": "system",
        "content": sys_cot,
    },
    {"role": "user", "content": "{{input}}"},
]

with open("./prompts/cot3.json", "w") as file:
    json.dump(cot3, file, indent=4)
