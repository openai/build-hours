# %%
import json
import os
from concurrent.futures import ThreadPoolExecutor
from tqdm import tqdm
import pandas as pd
from openai import OpenAI

client = OpenAI()

# Script params
n_samples = 12
n_self_reflection_loops = 1

# %%
# Define metaprompts to generate the data
SYS_PROMPT = """You are tasked with creating evaluation datasets designed to challenge large language models (LLMs), helping to characterize, benchmark, and improve their performance.

Instructions:
- Refer to the provided Eval definition, in <eval_task_definition> tags, for the characteristics of the task that we're trying to evaluate.
- Focus on the most difficult test cases that are likely to expose weaknesses in the model. Provide a short explanation for what each test case is evaluating and why it's challenging. Use the values in <examples> to see examples of passing and failing cases.
- You must follow the output format precisely, shown in <output_format> tags, and output valid json.

<output_format>
{
    case: <name of the test case>,
    reasoning: <outline thoughts behind the test case>,
    input: <input to the model>,
    correct_output: <correct output>
}
</output_format>"""

USER_PROMPT = """
<eval_task_definition>
{{task_definition}}
</eval_task_definition>

Output 1 test case, which are significantly different from the provided examples.
"""

classes = """## Billing and Payments
Description: Issues related to billing, payments, or invoices.
Example 1: "I was charged twice for my subscription this month."
Example 2: "My invoice shows an incorrect amount for this month."

## Cancellation
Description: Requests to cancel a subscription or service.
Example 1: "I would like to cancel my subscription effective immediately."
Example 2: "Please cancel my service at the end of the current billing cycle."

## Account Issues
Description: Problems with user accounts, such as login issues or account settings.
Example 1: "I am unable to log into my account even though I am sure I am using the correct password."
Example 2: "I need to update my email address but the system won't let me."

## Support (Admin Portal)
Description: Issues related to the administrative portal, including access, configuration, and management tasks.
Example 1: "I cannot access the admin portal to update user permissions."
Example 2: "The admin portal is not loading any data for user management."

## Technical Support (Authentication)
Description: Issues related to user authentication, including login, password resets, and multi-factor authentication.
Example 1: "I am not receiving the authentication code on my phone when trying to log in."
Example 2: "My password reset link has expired and I need a new one."

## Technical Support (Database)
Description: Problems related to database management, queries, or data retrieval.
Example 1: "My queries are taking too long to execute, and I am experiencing timeouts."
Example 2: "I am getting an error when trying to retrieve data from the database."

## Performance and Latency Issues
Description: Concerns about the speed and responsiveness of the software.
Example 1: "The application is very slow today, and it takes a long time to load pages."
Example 2: "There is a noticeable delay when I try to save my work."

## Technical Support (Web Hosting)
Description: Issues related to web hosting services, including server management and website deployment.
Example 1: "My website is down, and I am unable to access the server to check the logs."
Example 2: "I need help deploying my website to the server."

## Security Issues
Description: Concerns about the security of the software, including vulnerabilities, breaches, or suspicious activities.
Example 1: "I received an alert that someone tried to access my account from an unknown location."
Example 2: "There seems to be a security vulnerability in the login process."

## Legal and Compliance
Description: Issues related to legal matters, compliance with regulations, or terms of service.
Example 1: "I need to ensure our use of the software complies with GDPR regulations."
Example 2: "Can you provide information on how the software complies with data protection laws?"

## Feedback or Feature Request
Description: Suggestions for new features or improvements to the existing software.
Example 1: "It would be great if the software could support multi-language input for our international team."
Example 2: "I would like to suggest adding a dark mode to the user interface."
"""

task_definition = """
# Input
Inbound customer service-related chat from a customer for a very technical software Saas product, Nile Cloud, Inc.. These tickets can be very in-depth, and are sometimes multiple paragraphs in length.

# Triage Classes
Classification of the category of the ticket. In the final answer, there can be ONLY ONE, best classification.

{{classes}}

# Test case information
- Test cases are more difficult if they contain technical jargon, are missing information, and are subtly related to multiple categories and require careful reasoning to make the correct assignment.
- Each sample input should only have one primary classification intent.
""".replace(
    "{{classes}}", classes
)


n_batches = n_samples


def fetch_chat_completion(i):
    chat_completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": SYS_PROMPT,
            },
            {
                "role": "user",
                "content": USER_PROMPT.replace(
                    "{{task_definition}}", task_definition
                ).replace("{{case}}", "PASS"),
            },
        ],
        response_format={"type": "json_object"},
    )
    result = json.loads(chat_completion.choices[0].message.content)
    return result


with ThreadPoolExecutor() as executor:
    all_cases = list(
        tqdm(
            executor.map(fetch_chat_completion, range(n_batches)),
            total=n_batches,
            desc="Generating training samples",
        )
    )


# %%
# Implement self-reflection on the test cases with an LLM, confirm that they're valid, and update print if they are not
def self_reflect_and_validate_case(case):
    reflection_prompt = """
    You are an expert in evaluating test cases for machine learning evaluation datasets. Given the following test case, please analyze it and decide whether it is correct, or needs correction. Please respond in json. Always output an updated_case, even if no correction is needed. Please reason only about the correctness of the 'correct_output', and not whether in input conforms to the task definition.

    Task definition:
    {{task_definition}}

    Output format:
    {
        original_case: <case>,
        analysis: "",
        corrections_needed: ""
        is_original_case_correct: <bool>,
        updated_case: <updated_case>,
    }
    """
    res = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": reflection_prompt.replace(
                    "{{task_definition}}", task_definition
                ),
            },
            {"role": "user", "content": json.dumps(case, indent=2)},
        ],
        response_format={"type": "json_object"},
    )
    return res


def process_self_reflections_parallel(cases):
    with ThreadPoolExecutor() as executor:
        results = list(
            tqdm(
                executor.map(lambda x: self_reflect_and_validate_case(x), cases),
                total=len(cases),
                desc="Reflecting to correct logic and labels",
            )
        )
    return results


# Run n self-reflection loops!
self_critique_results_list_all = []
all_cases_corrected_current = all_cases

for i in range(n_self_reflection_loops):
    print("Correcting results with self reflection, i={}".format(i))
    self_critique_results = process_self_reflections_parallel(
        all_cases_corrected_current
    )
    self_critique_results = [
        json.loads(i.choices[0].message.content) for i in self_critique_results
    ]

    incorrect_cases = [
        result
        for result in self_critique_results
        if not result.get("is_original_case_correct", True)
    ]

    fraction_incorrect = (
        len(incorrect_cases) / len(self_critique_results)
        if self_critique_results
        else 0
    )
    print(f"Fraction of incorrect cases: {fraction_incorrect:.2f}")

    self_critique_results_list_all.append((fraction_incorrect, self_critique_results))

    if fraction_incorrect == 0:
        break

    all_cases_corrected_current = [i.get("updated_case") for i in self_critique_results]


# %%
# qc, unpack and construct prompt
df = pd.DataFrame(all_cases_corrected_current)

initial_count = len(df)
df = df[(pd.isnull(df["input"]) == False)]
print(
    f"Number of cases: before filtering = {initial_count}, after filtering = {len(df)}"
)

prompt_template = """Triage the provided customer service chat into one of the provided categories. You must select the single best category. Ensure the output class is returned on the last line.

# Classes:
{{classes}}

# Input Customer Service Chat:
{{input}}"""

df["prompt"] = df["input"].apply(
    lambda x: prompt_template.replace("{{classes}}", classes).replace("{{input}}", x)
)

print("Prompt sample:")
print(df["prompt"].iloc[0])

# Save
n_rows = len(df)
test_name = "customer_service_chat_triage_n={}".format(n_rows)

os.makedirs("./data", exist_ok=True)
df[["input", "prompt", "reasoning", "correct_output"]].to_csv(
    "./data/{}.csv".format(test_name), index=False
)

print("\nSaved file to ./data/{}.csv".format(test_name))
