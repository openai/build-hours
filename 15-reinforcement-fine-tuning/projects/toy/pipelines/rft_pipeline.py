# %%
%load_ext autoreload
%autoreload 2

# %%
"""Generate RFT jsonl datasets for all splits and upload if necessary."""

from __future__ import annotations

import asyncio, json, pathlib, sys, os
from typing import List, Dict, Any
from openai import AsyncOpenAI
from openai.types.fine_tuning import ReinforcementHyperparameters
from openai.lib._pydantic import to_strict_json_schema

# add repo root to path BEFORE importing utils
ROOT = pathlib.Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

# ensure project env
project_name = pathlib.Path(__file__).resolve().parents[1].name
os.environ.setdefault("PROJECT", project_name)

# %%
# now imports
from utils import build_rft_jsonl, get_or_upload_file, load_prompt, load_saved_grader, create_rft_job
from utils.project_paths import datasets_root, project_root

# Ensure structured_outputs can be imported
_cust_root = project_root()
if str(_cust_root) not in sys.path:
    sys.path.append(str(_cust_root))

# %%
USER_FIELD = "text_input"
PROMPT_NAME = "v1"
DATASET_NAME = project_name

prompt_obj = load_prompt(DATASET_NAME, PROMPT_NAME, prompt_type="developer")
assert prompt_obj, "Prompt not found"

# %%
# Collect splits present in data/
client = AsyncOpenAI()

splits = ["train", "val"]
train_file_id = None
val_file_id = None
for split in splits:
    data_path = next(datasets_root().glob(f"*_{split}.jsonl"))
    items = [json.loads(l) for l in data_path.read_text().splitlines()]
    rft_path = await build_rft_jsonl(prompt_obj.text, prompt_obj.id, items, split=split, user_field=USER_FIELD)
    file_id = await get_or_upload_file(client, rft_path, purpose="fine-tune")
    print(f"[RFT] Split {split}: file_id = {file_id}")
    if split == "train":
        train_file_id = file_id
    elif split in {"val", "valid", "validation"}:
        val_file_id = file_id

# %%
# Load the response format
from structured_outputs.base_models import Sentiment
schema = to_strict_json_schema(Sentiment)
RESPONSE_FORMAT = dict(
    type="json_schema",
    json_schema={
        "name":Sentiment.__name__,
        "schema":schema,
        "strict":True,
    }
)

# %%
# Load grader for RFT
GRADER = load_saved_grader(
    DATASET_NAME, 
    "sentiment_similarity",
)
# %%
# Hyper-parameters for RFT fine-tuning -----------------------------
HPARAMS = ReinforcementHyperparameters(
    n_epochs=1,
    reasoning_effort="low",
    eval_samples=3,
    compute_multiplier=1,
)

# %%
# Create RFT job
job_id = await create_rft_job(
    client=client,
    train_file_id=train_file_id,
    val_file_id=val_file_id,
    grader=GRADER,
    base_model="o4-mini-2025-04-16",
    hp=HPARAMS,
    suffix="rft",
    seed=42,
    response_format=RESPONSE_FORMAT,
)

# %%
