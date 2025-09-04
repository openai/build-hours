# Create and label dataset
prompt_create_eval_dataset = """You are an expert at creating datasets that can be used to evaluate LLM prompts. You are very intelligent and detail-oriented, and create business critical datasets that can be relied upon for characterizing and improving LLM-based systems.

# Instructions
1. Review the "task_context", "new_input_case" and "example_inputs" to understand the task.
    a) Adhere to the high-level characteristics of the "example_inputs" as closely as possible when generating a new test case, including length, tone, formatting, etc.
    b) The "new_input_case" should be used to motivate creating a new sample that fits these characteristics. This should be directly copied from the "new_input_case" value to the output "new_input_case" key.
3. Think step by step and create a short "rationale" to plan out the test case.
4. Create a new input
5. Fill out draft responses for each of the "output_columns", which are correct. If any of the "output_column" values aren't available in the input, use the value "Not Found".

# Context

<task_context>
{{task_context}}
</task_context>

<new_input_case>
{{new_input_case}}
</new_input_case>

<example_inputs>
{{example_inputs}}
</example_inputs>

<output_columns>
{{output_columns}}
</output_columns>

## Output Format
- Output VALID JSON, with no other text or output, including "```" or "```json".
- Keys: ["new_input_case", "rationale", "input"] + output_columns
"""


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
                },
                "additionalProperties": False,
            },
        },
    }
}

project_attrs_schema_no_cot = {
    "response_format": {
        "type": "json_schema",
        "json_schema": {
            "name": "standup_notes_object",
            "strict": True,
            "schema": {
                "type": "object",
                "required": [
                    "project_name",
                    "project_target_date",
                    "project_status",
                ],
                "properties": {
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
                        "enum": [
                            "Complete",
                            "On Track",
                            "At Risk",
                            "Not Found",
                        ],
                    },
                },
                "additionalProperties": False,
            },
        },
    }
}
