from openai import OpenAI
from demo_util import color


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


messages = []
while True:
    user = input(color("User: ", "blue") + "\033[90m")
    messages.append({"role": "user", "content": user})

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system_message}] + messages,
    )
    message = response.choices[0].message
    print(color("Assistant:", "yellow"), message.content)

    messages.append(message)
