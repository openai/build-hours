from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Callable, Any

from .project_paths import eval_runs_root

__all__ = [
    "RunRecord",
    "get_manifest_path",
    "save_run",
    "load_manifest",
    "load_run_outputs",
    "load_runs",
]

# ---------------------------------------------------------------------------
# Helpers to resolve paths lazily
# ---------------------------------------------------------------------------

def _output_root() -> pathlib.Path:
    return eval_runs_root()


@dataclass
class RunRecord:
    """Lightweight JSON-serialisable metadata for a single Eval run."""

    # --- Required (no default) fields -----------------------------------
    prompt: Dict[str, Any]
    eval_id: str
    run_id: str
    model: str
    timestamp: str  # ISO-format
    dataset: str

    # --- Optional / defaulted fields -----------------------------------
    # For backward compatibility, keep single grader_name but prefer grader_names list
    grader_name: str | None = None
    grader_names: List[str] = field(default_factory=list)
    reasoning_effort: str | None = None
    items: List[Dict[str, Any]] = field(default_factory=list)
    split: str | None = None


# ---------------------------------------------------------------------------
# JSON helpers – write/read
# ---------------------------------------------------------------------------

def get_manifest_path(_) -> pathlib.Path:
    """Return path to global ``runs_manifest.jsonl`` file inside project."""
    p = _output_root() / "runs_manifest.jsonl"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def save_run(record: RunRecord):
    """Persist *record* to ``eval_runs/<dataset>/<run_id>/`` and update manifest."""

    run_folder = _output_root() / record.run_id
    run_folder.mkdir(parents=True, exist_ok=True)

    # Save metadata (without items) -----------------------------------------
    meta = asdict(record, dict_factory=lambda x: {k: v for k, v in x if k != "items"})
    (run_folder / "metadata.json").write_text(json.dumps(meta, indent=2))

    # Save per-sample outputs ----------------------------------------------
    with (run_folder / "outputs.jsonl").open("w") as fp:
        for item in record.items:
            fp.write(json.dumps(item) + "\n")

    # Update manifest -------------------------------------------------------
    manifest_entry = {
        "run_id": record.run_id,
        "eval_id": record.eval_id,
        "dataset": record.dataset,
        "prompt_id": record.prompt.get("id"),
        "model": record.model,
        # Store both single and multi-grader fields for compatibility
        "grader_name": record.grader_name or None,
        "grader_names": record.grader_names or ([record.grader_name] if record.grader_name else []),
        "timestamp": record.timestamp,
        "reasoning_effort": record.reasoning_effort,
        "split": record.split,
        "n_items": len(record.items),
    }
    manifest_path = get_manifest_path(None)

    existing = set()
    if manifest_path.exists():
        with manifest_path.open() as mf:
            existing = {json.loads(l)["run_id"] for l in mf}
    if record.run_id not in existing:
        with manifest_path.open("a") as mf:
            mf.write(json.dumps(manifest_entry) + "\n")


# ----------------------- Convenience load helpers --------------------------

def load_manifest(_: str | None = None):
    path = get_manifest_path(None)
    if not path.exists():
        return []
    with path.open() as f:
        return [json.loads(line) for line in f]


def load_run_outputs(_: str, run_id: str):
    out_path = _output_root() / run_id / "outputs.jsonl"
    if not out_path.exists():
        return []
    with out_path.open() as f:
        return [json.loads(line) for line in f]


def load_runs(dataset: str, filter_fn: Callable[[dict], bool] | None = None):
    metas = load_manifest()
    if filter_fn is not None:
        metas = [m for m in metas if filter_fn(m)]
    for m in metas:
        m["items"] = load_run_outputs(dataset, m["run_id"])
    return metas 