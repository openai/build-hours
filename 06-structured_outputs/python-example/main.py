from dataclasses import Field
from enum import Enum
from pydantic import BaseModel
from openai import OpenAI

from data.input import INPUT

client = OpenAI()

class Importance(Enum):
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'

class KeyConcept(BaseModel):
    title: str
    description: str
    importance: Importance

class PaperInformation(BaseModel):
    title: str
    authors: list[str]
    abstract_summary: str
    keywords: list[str]
    key_concepts: list[KeyConcept]

SYSTEM_PROMPT = "You will be provided with a research paper. Your goal is to extract information from this paper in a structured format.";

completion = client.beta.chat.completions.parse(
model="gpt-4o-2024-08-06",
messages=[
    {"role": "system", "content": SYSTEM_PROMPT},
    {"role": "user", "content": INPUT}
],
response_format=PaperInformation,
)

response = completion.choices[0].message.parsed
print(response)
