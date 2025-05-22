from agents import Agent, function_tool as tool
from utils import run_demo_loop
from mock_api import MockAPI
from typing import Optional

mock_api = MockAPI()


@tool
def search_policies(query: str):
    return mock_api.search_policies(query)


@tool
def get_emails(to: Optional[str] = None):
    return mock_api.get_emails(to)


@tool
def send_email(from_addr: str, to_addr: str, subject: str, body: str):
    return mock_api.send_email(from_addr, to_addr, subject, body)


agent = Agent(
    name="Assistant",
    model="o3",
    tools=[search_policies, get_emails, send_email],
)

run_demo_loop(agent)
