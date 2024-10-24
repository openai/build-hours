# %%
from openai import OpenAI
import pandas as pd

client = OpenAI()

# df = pd.read_csv("./data/01_simple_example_v1_reviewed.csv")
df = pd.read_csv("./data/reviewed_stanbot_outputs_n=18.csv")

print("loaded {} rows".format(len(df)))

# Get eval dataset ready to use with promptfoo
tests = []

for idx, row in df.iterrows():
    tests.append(
        {
            "description": "test if project is correctly extracted",
            "vars": {
                "context": row["input"],
                "case": row["new_input_case"],
                "summary_key_points": row["summary_key_points"],
            },
            "assert": [
                {
                    "metric": "project_name",
                    "type": "python",
                    "value": f"output.get('project_name').lower() == '{row['project_name'].lower()}'",
                },
                {
                    "metric": "project_target_date",
                    "type": "python",
                    "value": f"output.get('project_target_date').lower() == '{row['project_target_date'].lower()}'",
                },
                {
                    "metric": "project_status",
                    "type": "python",
                    "value": f"output.get('project_status').lower() == '{row['project_status'].lower()}'",
                },
                {
                    "metric": "context-faithfulness",  # model-graded
                    "type": "llm-rubric",
                    "value": """You are a "EVAL assistant" evaluating prompts and responses for hallucinations. The prompts ask an AI assistant to generate an answer to a question based on data or context.

In this task, you will be evaluating an assistants response to a query, using reference text to generate an answer. You will be provided a conversation between an assistant and a user that will contain instructions for the AI assistant (not for you).

The answer is generated to the question based on the reference text. The answer may contain false information, you must use the reference text to determine if the answer to the question contains false information, if the answer is a hallucination of facts. Your objective is to determine whether the reference text contains factual information and is not a hallucination. A 'hallucination' in this context refers to an answer that is not based on the reference text or assumes information that is not available in the reference text. Your response should be a single word: either "factual" or "hallucinated", and it should not include any other text or characters. "hallucinated" indicates that the answer provides factually inaccurate information to the query based on the reference text. "factual" indicates that the answer to the question is correct relative to the reference text, and does not contain made up information. Please read the query and reference text carefully before determining your response.

[BEGIN DATA]
************
[Context to AI Assistant]:
{{context}}
[END DATA]""",  # From Arize
                },
                {
                    "metric": "key_points_in_summary",  # TODO benchmark
                    "type": "llm-rubric",
                    "value": """Evaluate whether the items in summary_key_points are covered in the output. Use a full point (1) for a strong match and a half point (0.5) for a partial match. If there are no points in summary_key_points, then assign a score of 0.0.

<summary_key_points>
{{summary_key_points}}
</summary_key_points>

Think step by step and output the final ratio of `n_matching_points_in_output / n_summary_key_points` on a new line at the end of the output, formatted like "Fraction: 0.25", with no additional markdown or ``` characters.
""",
                },
            ],
        }
    )

# Add prompts
prompts = [
    """Consider this transcript and extract the following information.

# Transcript:
{{context}}
""",
    """You are an expert at correctly extracting information from meeting transcripts. Please consider the provided transcript and context and extract the relevant information provided in the schema.
    # Additional Rules
    
    ## Project Status
    - Look for explicit mention of project status, but if everything is proceeding as expected it's okay to assume that a project is "On Track"
    - Definitions
        - Complete: The project has been completed. Note that just because tasks within the project are mentioned to be complete, that doesn't necessarily indicate the whole project is complete. If a project still needs to roll out, that means it isn't complete. It must be said explicitly that a project is complete.
        - On Track: This means that things are going well and the project is likely going to land on the planned date. Includes language like "on track" or "looking good to ship".
        - At Risk: It's unlikely the project will be delivered on the planned date.
            - Includes language like "delayed" or "taking longer than expected" or "need more resourcing".
            - If there are any blockers, especially ones without a clear path to quick resolution, then the project should be At Risk.
            - If the team is discussing pulling in more personnell to help, the project should be At Risk.
    
    ## Project Target Date
    - Look for explicit information about when a project is scheduled to ship. Even if the date is at risk, it's important to extract any mentioned dates for when the project was planned to launch.
    - If the target ship date was changed in the standup, return the original start date.
    - Do not include information about task ship dates.
    - Example1:
        - Input: "Our initial target was to complete by November 5th 2024... However, due to the recent changes, let's tentatively adjust our target date to November 8th."
        - Output: 11/05/2024
    
    ## Project Name
    - The name of the project or initiative. Can refer to any large product launch, initiative, or feature that people are working on in the standup.
    - Any individual feature or task name within a project is not the project name
    - It's okay if it's broad, like "product launch", but it can't be something purely operational like "Latest Deployment".
    - Example1
        - Input: "We're working on the Mars Project"
        - Project Name: "Mars Project"
    - Example2:
        Input: "I've been developing the new feature, but I'm encountering some problems"
        Output: "Not Found"
    - Example2:
        Input: "I've been handling the front-end interface"
        Output: "Not Found"
        
    # Summary Details
    - It's not necessary to repeat project name, date, or status as that will be displayed with the summary
    - Summarize important tasks and progress, especially when blocked
    - Call out any key decisions, points of confusion, or action items that come up on the call.
    
    # Transcript:
    {{context}}
    """,
]

output_schema_with_cot = {
    "response_format": {
        "type": "json_schema",
        "json_schema": {
            "name": "standup_notes_object",
            "strict": True,
            "schema": {
                "type": "object",
                "required": [
                    "reasoning",
                    "project_name",
                    "project_target_date",
                    "project_status",
                    "summary",
                ],
                "properties": {
                    "reasoning": {
                        "type": "string",
                        "description": "Analyze the context and think step by step about what the correct values are for each field.",
                    },
                    "project_name": {
                        "type": "string",
                        "description": "The name of the project, in Title Case. Exclude the word 'Project' from project names. If none, output 'Not Found'.",
                    },
                    "project_target_date": {
                        "type": "string",
                        "description": "The proposed release date of the project, if available. Please infer the date if possible. Format is mm/dd/yyyy. Otherwise 'Not Found'",
                    },
                    "project_status": {
                        "type": "string",
                        "description": "The current status of the property or item, such as active, inactive or pending",
                        "enum": ["Complete", "On Track", "At Risk", "Not Found"],
                    },
                    "summary": {
                        "type": "string",
                        "description": "A few sentences summarizing the key points from the transcript.",
                    },
                },
                "additionalProperties": False,
            },
        },
    }
}


providers = [
    {
        "id": "openai:gpt-4o-2024-08-06",
        "config": output_schema_with_cot,
    },
]

promptfoo_config = {
    "providers": providers,
    # "defaultTest": {"options": {"provider": "openai:o1-preview"}},
    "prompts": prompts,
    "tests": tests,
}

import yaml

output_yaml_path = "./data/pfoo_eval_stanbot.yaml"

with open(output_yaml_path, "w") as file:
    yaml.dump(promptfoo_config, file)

print(f"promptfoo config saved to {output_yaml_path}")

# Run in terminal
# promptfoo eval -c 24-10-17_evals_build_hour/data/promptfoo_config.yaml

# %%
