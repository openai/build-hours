from openai import OpenAI
from demo_util import color
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
    "3. ONLY if not satisfied, offer a refund.\n"
    "4. If accepted, search for the ID and then execute refund."
    ""
)
tools = [
    {
        "type": "function",
        "function": {
            "name": "execute_refund",
            "description": "",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["item_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "look_up_item",
            "description": "Use to find item ID.\n    Search query can be a description or keywords.",
            "parameters": {
                "type": "object",
                "properties": {"search_query": {"type": "string"}},
                "required": ["search_query"],
            },
        },
    },
]


def run_full_turn(system_message, tools, messages):
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system_message}] + messages,
        tools=tools,
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
