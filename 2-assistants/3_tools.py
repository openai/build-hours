from openai import OpenAI
from demo_util import color, function_to_schema
import json


client = OpenAI()

# === Demo Loop ===

model = "gpt-4o-mini"
system_message = (
    "You are a customer support agent for ACME Inc."
    "Always answer in a sentence or less."
    "Follow the following routine with the user:"
    "1. First, ask probing questions and understand the user's problem deeper.\n"
    " - unless the user has already provided a reason.\n"
    "2. Propose a fix (make one up).\n"
    "3. ONLY if not satesfied, offer a refund.\n"
    "4. If accepted, search for the ID and then execute refund."
    ""
)


def look_up_item(search_query):
    """Use to find item ID.
    Search query can be a description or keywords."""
    item_id = "item_132612938"
    print(color("Found item:", "green"), item_id)
    return item_id


def execute_refund(item_id, reason="not provided"):
    print(color("\n\n=== Refund Summary ===", "green"))
    print(color(f"Item ID: {item_id}", "green"))
    print(color(f"Reason: {reason}", "green"))
    print("=================\n")
    print(color("Refund execution successful!", "green"))
    return "success"


tools = [execute_refund, look_up_item]


def run_full_turn(system_message, tools, messages):

    tool_schemas = [function_to_schema(f) for f in tools]

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system_message}] + messages,
        tools=tool_schemas,
    )
    message = response.choices[0].message
    messages.append(message)

    if message.content:
        print(color("Assistant:", "yellow"), message.content)

    if not message.tool_calls:
        return message

    # print tool calls
    for tool_call in message.tool_calls:
        name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)
        print(
            color("Assistant:", "yellow"),
            color(f"Executing tool call: {tool_call.function.name}({args})", "magenta"),
        )

    return message


messages = []
while True:
    user = input(color("User: ", "blue") + "\033[90m")
    messages.append({"role": "user", "content": user})

    run_full_turn(system_message, tools, messages)
