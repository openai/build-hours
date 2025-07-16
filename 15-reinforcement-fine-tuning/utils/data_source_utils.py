from __future__ import annotations

from typing import Dict, Any, Optional

from utils.prompt_utils import Prompt

__all__ = ["build_data_source"]


def build_data_source(
    prompt: Prompt,
    dataset_file_id: str,
    user_field: str,
    model: str = "gpt-4o-mini",
    datasource_type: str = "responses",
    model_params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Construct an OpenAI Evals *data_source* dictionary.

    The JSON structure returned must comply with the Evals API schema.  See
    https://platform.openai.com/docs/evals for official documentation.
    """

    data_source: Dict[str, Any] = {
        "type": datasource_type,
        "model": model,
        "input_messages": {
            "type": "template",
            "template": [
                {
                    "type": "message",
                    "role": "developer",
                    "content": {
                        "type": "input_text",
                        "text": prompt.text,
                    },
                },
                {
                    "type": "message",
                    "role": "user",
                    "content": {
                        "type": "input_text",
                        "text": f"{{{{ item.{user_field} }}}}",
                    },
                },
            ],
        },
        "source": {"type": "file_id", "id": dataset_file_id},
    }

    if model_params:
        data_source["sampling_params"] = model_params

    return data_source 