from agents import Agent, function_tool
from utils import run_demo_loop
from openai import OpenAI


client = OpenAI()


@function_tool
def search_web(query: str):
    return "This is a test"


@function_tool
def start_task(description: str):
    response = client.responses.create(
        input=description,
        model="o3",
        background=True,
    )
    return response.id


@function_tool
def get_tasks(id: str):
    response = client.responses.retrieve(response_id=id)
    return response.output


agent = Agent(
    name="Assistant",
    model="gpt-4.1-mini",
    tools=[search_web],
)

run_demo_loop(agent)
