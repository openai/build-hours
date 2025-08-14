from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Schema: list of {code: <level1_code>} objects
# ---------------------------------------------------------------------------

class Level1Code(BaseModel):
    code: str


class Level1Codes(BaseModel):
    """Structured output consisting of a ``level1`` list where each element
    (``Level1Code``) provides the predicted EuroVoc Level-1 descriptor.
    """
    level1: list[Level1Code]