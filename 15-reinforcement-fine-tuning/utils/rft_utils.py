from __future__ import annotations

import json
import pathlib
from typing import List, Dict, Any

from utils.project_paths import datasets_root, project_root
from openai.types.fine_tuning import ReinforcementMethod, ReinforcementHyperparameters

__all__ = [
    "build_rft_jsonl",
    "create_rft_job",
]


async def build_rft_jsonl(
    prompt_text: str,
    prompt_id: str,
    dataset_items: List[Dict[str, Any]],
    *,
    split: str,
    user_field: str,
    tools: List[Dict[str, Any]] | None = None,
) -> pathlib.Path:
    """Create an RFT-ready .jsonl file for a particular split & prompt.

    Each output line:
    {
      "id": <id>,
      "messages": [ {"role": "developer", "content": <prompt>},
                     {"role": "user",      "content": item[user_field] } ],
      "reference_answer": item["reference_answer"],
      "tools": [...optional...]
    }
    """
    if tools is None:
        tools = []

    out_name = f"rft_{split}_{prompt_id}.jsonl"
    out_path = project_root() / "data" / out_name

    with out_path.open("w", encoding="utf-8") as fp:
        for raw in dataset_items:
            item = raw.get("item", raw)  # unwrap if dataset has top-level 'item'
            line = {
                "id": item.get("id"),
                "messages": [
                    {"role": "developer", "content": prompt_text},
                    {"role": "user", "content": item[user_field]},
                ],
                "reference_answer": item["reference_answer"],
            }
            if tools:
                line["tools"] = tools
            fp.write(json.dumps(line, ensure_ascii=False) + "\n")

    print(f"[RFT] Created {out_path.relative_to(project_root())}")
    return out_path

# ---------------------------------------------------------------------------
# RFT job helper
# ---------------------------------------------------------------------------

async def create_rft_job(
    client,
    train_file_id: str,
    val_file_id: str,
    grader,
    base_model: str = "o4-mini",
    hp: Dict[str, Any] | None = None,
    suffix: str = "rft",
    seed: int = 42,
    response_format: Dict[str, Any] | None = None,
) -> str:
    """Create an OpenAI RFT job and return the job_id.

    Parameters
    ----------
    grader : a grader object (e.g., ScoreModelGrader)
    hp : dict
        ReinforcementHyperparameters values. If None, sensible defaults are used.
    """

    # allow caller to pass already constructed ReinforcementHyperparameters
    assert isinstance(hp, ReinforcementHyperparameters), "hp must be a ReinforcementHyperparameters object"

    rm_obj = dict(
        grader=grader,
        hyperparameters=hp,
        response_format=response_format,
    )

    job = await client.fine_tuning.jobs.create(
        model=base_model,
        training_file=train_file_id,
        validation_file=val_file_id,
        method={
            "type": "reinforcement",
            "reinforcement": rm_obj,
        },
        suffix=suffix,
        seed=seed,
    )
    print("[RFT] Job created:", job.id)
    print(f"View the job details at: https://platform.openai.com/finetune/{job.id}")
    return job.id