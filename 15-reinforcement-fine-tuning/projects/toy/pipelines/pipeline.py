# %%
%load_ext autoreload
%autoreload 2

# %%
# pipelines/toy/pipeline.py
"""Evaluation pipeline for the *toy* dataset.

This file lives in the customer-scoped tree (`customers/toy/pipelines`).  It can
be executed either interactively (cell-by-cell) or from the command line:

    python -m customers.toy.pipelines.pipeline

All filesystem artefacts (prompts, runs, graders, …) are stored under
`customers/toy/` thanks to the `utils.project_paths` helpers.
"""

from __future__ import annotations

import datetime
import os
import pathlib
import sys
from typing import Any, Dict, List

from openai import AsyncOpenAI
from openai.types.graders import TextSimilarityGrader

# Ensure repo root on PYTHONPATH & set active customer
# ---------------------------------------------------------------------------
ROOT = pathlib.Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

# ---------------------------------------------------------------------------
# Infer project name from directory structure and set env var automatically
# e.g. .../projects/<project>/pipelines/pipeline.py -> <project>
# ---------------------------------------------------------------------------
project_name = pathlib.Path(__file__).resolve().parents[1].name  # parent of pipelines/
os.environ.setdefault("PROJECT", project_name)

# %%
# Project helpers (import after PROJECT is set!)
from utils import (
    infer_item_schema,
    build_data_source,
    wait_until_finished,
    fetch_all_output_items,
    extract_items,
    save_run,
    save_grader,
    RunRecord,
    load_prompt,
    get_or_upload_file,
)
from utils.project_paths import datasets_root, project_root
from utils.plot_eval_runs import (
    load_scores_by_item,
    compute_score_stats,
    plot_score_stats,
)

# Ensure structured_outputs can be imported
_cust_root = project_root()
if str(_cust_root) not in sys.path:
    sys.path.append(str(_cust_root))

# %%
# Configuration
# ---------------------------------------------------------------------------
# Dataset auto-discovery: pick first *_{SPLIT}.jsonl file under `data/`
# ---------------------------------------------------------------------------

# Select data split ---------------------------------------------------------
SPLIT = "train"  # choose "train", "val", "test" etc.

try:
    DATA_PATH = next(datasets_root().glob(f"*_{SPLIT}.jsonl"))
except StopIteration as e:
    raise FileNotFoundError("No *_train.jsonl dataset found in data/ folder") from e

DATASET_NAME = project_name  # use folder name as dataset identifier

# %%
# Response JSON schema -------------------------------------------------------
from openai.lib._pydantic import to_strict_json_schema 
from structured_outputs.base_models import Sentiment

schema = to_strict_json_schema(Sentiment)
RESPONSE_FORMAT: Dict[str, Any] = {
    "type": "json_schema",
    "name": Sentiment.__name__,
    "schema": schema,
    "strict": True,
}

# %%
MODEL_NAME = "gpt-4o-mini"
MODEL_PARAMS: Dict[str, Any] = {
    # Standard response params
    "seed": 42,
    "temperature": None,
    "top_p": None,
    "max_completions_tokens": None,
    "text": {"format": RESPONSE_FORMAT},  # or None to disable JSON mode
    # Reasoning-specific params (responses models)
    "reasoning_effort": None,  # set to None or "low"/"medium"/"high"
    # Tools / function calling
    "tools": None,
}
# Remove keys with explicit None so we don't send them to the API
MODEL_PARAMS = {k: v for k, v in MODEL_PARAMS.items() if v is not None}

# %%
# Grader --------------------------------------------------------------------
GRADER = TextSimilarityGrader(
    type="text_similarity",
    name="sentiment_similarity",
    input="{{ sample.output_json.sentiment }}",
    reference="{{ item.reference_answer }}",
    evaluation_metric="fuzzy_match",
)

# Persist grader definition for future reuse/analysis ---------
save_grader(GRADER)

# %%
# Async main

# Prompt
PROMPT_NAME = "v1"
prompt_obj = load_prompt(DATASET_NAME, PROMPT_NAME, prompt_type="developer")
if prompt_obj is None:
    raise RuntimeError(f"Prompt {PROMPT_NAME} not found – create it under prompts/{DATASET_NAME}/")
prompt = prompt_obj

# %%
# Upload dataset & create eval
client = AsyncOpenAI()
file_id = await get_or_upload_file(client, DATA_PATH)
item_schema = infer_item_schema(DATA_PATH)

eval_obj = await client.evals.create(
    name=f"sentiment-live-{prompt.name}",
    metadata={"description": f"Live eval – {prompt.name}"},
    data_source_config={
        "type": "custom",
        "item_schema": item_schema,
        "include_sample_schema": True,
    },
    testing_criteria=[GRADER],
)
eval_id = eval_obj.id
print("Eval created:", eval_id)

# %%
# Build data_source config
USER_FIELD = "text_input"
data_source = build_data_source(
    prompt,
    file_id,
    USER_FIELD,
    model=MODEL_NAME,
    model_params=MODEL_PARAMS,
    datasource_type="responses",
)

# %%
# Run loop
N_RUNS = 3
for i in range(N_RUNS):
    print(f"\n=== Run {i + 1}/{N_RUNS} ===")
    run = await client.evals.runs.create(
        eval_id=eval_id,
        name=f"variance-{prompt.name}-run{i + 1}",
        data_source=data_source,
    )
    print("Run URL:", getattr(run, "report_url", "<no url>"))

    await wait_until_finished(client, eval_id, run.id)
    items_raw = await fetch_all_output_items(client, eval_id, run.id)
    items = extract_items(items_raw)

    # Quick peek ---------------------------------------------------------
    if items_raw:
        content_preview = items_raw[0].sample.output[0].content if items_raw[0].sample and items_raw[0].sample.output else "<no output>"
        print("First assistant output:", content_preview)

    record = RunRecord(
        dataset=DATASET_NAME,
        prompt=vars(prompt),
        eval_id=eval_id,
        run_id=run.id,
        model=MODEL_NAME,
        grader_name=GRADER.name,
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        reasoning_effort=None,
        split=SPLIT,
        items=items,
    )
    save_run(record)
    scores: List[float] = [it["score"] for it in items]
    print(f"Accuracy = {sum(scores)/len(scores):.3f}")

# %%
scores_by_item, runs = load_scores_by_item(
    DATASET_NAME,
    prompt_id=prompt.id,
    model=MODEL_NAME,
    grader_name=GRADER.name,
    split=SPLIT,
)

stats = compute_score_stats(scores_by_item)
plot_score_stats(stats, n_runs=len(runs))

# %% 