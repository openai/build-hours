from openai import OpenAI
from demo_util import color


client = OpenAI()

# === Demo Loop ===

model = "gpt-4o-mini"
system_message = "You are a helpful Assistant."

messages = []
while True:
    # get user input
    user = input(color("User: ", "blue") + "\033[90m")
    messages.append({"role": "user", "content": user})

    # get model completion
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system_message}] + messages,
    )
    message = response.choices[0].message
    print(color("Assistant:", "yellow"), message.content)

    # add message to history
    messages.append(message)
