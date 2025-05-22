from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    input="Hello, world!",
    model="o3",
    background=True,
)

print(response)
