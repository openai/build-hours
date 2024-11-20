from openai import OpenAI
from demo_util import color, function_to_schema
import json
from pydantic import BaseModel


class Agent(BaseModel):
    name: str = "Agent"
    model: str = "gpt-4o"
    instructions: str = "You are a helpful Agent"
    tools: list = []


class Response(BaseModel):
    messages: list


client = OpenAI()

# === Demo Loop ===


def run_full_turn(agent, messages):

    num_init_messages = len(messages)
    messages = messages.copy()

    while True:

        # turn python functions into tools and save a reverse map
        tool_schemas = [function_to_schema(tool) for tool in agent.tools]
        tools_map = {tool.__name__: tool for tool in agent.tools}

        # === 1. get openai completion ===
        response = client.chat.completions.create(
            model=agent.model,
            messages=[{"role": "system", "content": agent.instructions}] + messages,
            tools=tool_schemas or None,
        )
        message = response.choices[0].message
        messages.append(message)

        if message.content:  # print assistant response
            print(color("Assistant:", "yellow"), message.content)

        if not message.tool_calls:  # if finished handling tool calls, break
            break

        # === 2. handle tool calls ===

        for tool_call in message.tool_calls:
            result = execute_tool_call(tool_call, tools_map)

            result_message = {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            }
            messages.append(result_message)

    # ==== 3. return new messages =====
    return messages[num_init_messages:]


def execute_tool_call(tool_call, tools_map):
    name = tool_call.function.name
    args = json.loads(tool_call.function.arguments)

    print(color("Assistant:", "yellow"), color(f"{name}({args})", "magenta"))

    # call corresponding function with provided arguments
    return tools_map[name](**args)


# === Agents ===


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


def escalate_to_human(summary):
    """Only call this if explicitly asked to."""
    print(color("Escalating to human agent...", "red"))
    print("\n=== Escalation Report ===")
    print(f"Summary: {summary}")
    print("=========================\n")
    exit()


agent = Agent(
    name="Issues and Repairs Agent",
    instructions=(
        "You are an Issues and Repairs Agent agent for ACME Inc."
        "Always answer in a sentence or less."
        "Introduce yourself first (company, role), and immediately start this routine with the user:"
        "1. First, ask specific, probing questions and understand the user's problem deeper.\n"
        " - unless the user has already provided a reason.\n"
        "2. Propose a fix (make one up). Wait for the user to try it.\n"
        "3. ONLY if not satisfied, offer a refund.\n"
        "4. If accepted, search for the ID and then execute refund."
        ""
    ),
    tools=[execute_refund, look_up_item, escalate_to_human],
)

messages = []
while True:
    user = input(color("User: ", "blue") + "\033[90m")
    messages.append({"role": "user", "content": user})

    new_messages = run_full_turn(agent, messages)
    messages.extend(new_messages)
