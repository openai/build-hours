from pydantic import BaseModel

class Sentiment(BaseModel):
    sentiment: str
    reasoning: str