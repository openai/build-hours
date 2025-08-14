from __future__ import annotations

import json
import pathlib
from typing import Any, Dict, Union

from .project_paths import graders_root

__all__ = [
    "save_grader",
    "load_saved_grader",
]


def _root() -> pathlib.Path:
    return graders_root()


# ---------------------------------------------------------------------------
# Serialisation
# ---------------------------------------------------------------------------


def _serialize_grader(grader) -> Dict[str, Any]:
    """Best-effort serialisation using common Pydantic / dataclass conventions."""

    for attr in ("model_dump", "dict", "model_dump_json", "json"):
        fn = getattr(grader, attr, None)
        if fn is None:
            continue
        try:
            data = fn()  # type: ignore[call-arg]
            if isinstance(data, str):
                return json.loads(data)
            return data  # type: ignore[return-value]
        except Exception:
            continue
    try:
        if isinstance(grader, dict):
            return grader
        else:
            return grader.__dict__  # type: ignore[attr-defined]
    except Exception as exc:
        raise TypeError(f"Cannot serialise grader of type {type(grader)}: {exc}") from exc


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def save_grader(grader, dataset: str | None = None):
    """Save *grader* definition to ``graders_saved/<name>.json``.

    Tries, in order, to determine the filename from:

    1. ``grader.name`` attribute (common for Pydantic models)
    2. ``grader["name"]`` if *grader* behaves like a mapping
    3. The ``"name"`` key of the serialised data
    4. Finally falls back to ``grader.__class__.__name__``.
    """

    data = _serialize_grader(grader)

    # Guarantee a 'type' field so it can be re-loaded later
    data.setdefault("type", grader.__class__.__name__)

    name = None

    # 1) Attribute access (Pydantic models)
    name = getattr(grader, "name", None)

    # 2) Mapping-style access
    if not name and isinstance(grader, dict):
        name = grader.get("name")

    # 3) Fallback to serialised data
    if not name:
        name = data.get("name")

    # 4) Final fallback – class name
    if not name:
        name = grader.__class__.__name__.lower()

    out_path = _root() / f"{name}.json"
    out_path.write_text(json.dumps(data, indent=2))
    return out_path


# ------------------------------ Loading ------------------------------------

def _grader_class_for_type(gtype: str):
    """Return the proper class for a grader *type* (explicit mapping)."""

    from openai.types.graders import (  # import locally to avoid heavy deps at import time
        MultiGrader,
        PythonGrader,
        LabelModelGrader,
        ScoreModelGrader,
        StringCheckGrader,
        TextSimilarityGrader,
        MultiGraderParam,
        PythonGraderParam,
        LabelModelGraderParam,
        ScoreModelGraderParam,
        StringCheckGraderParam,
        TextSimilarityGraderParam,
    )  # type: ignore

    _MAP = {
        # Core graders
        "multi": MultiGrader,
        "multi_grader": MultiGrader,
        "python": PythonGrader,
        "python_grader": PythonGrader,
        "label_model": LabelModelGrader,
        "label_model_grader": LabelModelGrader,
        "score_model": ScoreModelGrader,
        "score_model_grader": ScoreModelGrader,
        "string_check": StringCheckGrader,
        "string_check_grader": StringCheckGrader,
        "text_similarity": TextSimilarityGrader,
        "text_similarity_grader": TextSimilarityGrader,
        # Param variants
        "multi_grader_param": MultiGraderParam,
        "python_grader_param": PythonGraderParam,
        "label_model_grader_param": LabelModelGraderParam,
        "score_model_grader_param": ScoreModelGraderParam,
        "string_check_grader_param": StringCheckGraderParam,
        "text_similarity_grader_param": TextSimilarityGraderParam,
    }
    try:
        return _MAP[gtype]
    except KeyError as exc:
        raise ValueError(f"Unknown grader type '{gtype}'") from exc


def load_saved_grader(dataset: str | None, grader_name: str, verbose: bool = False):
    """Load grader previously saved with :func:`save_grader`."""

    path = _root() / f"{grader_name}.json"
    if not path.exists():
        raise FileNotFoundError(path)

    data = json.loads(path.read_text())

    def _strip_pass_threshold(obj: Any):  # noqa: ANN401 – Any is fine here
        """Recursively delete "pass_threshold" keys from *obj* in-place."""
        if isinstance(obj, dict):
            obj.pop("pass_threshold", None)
            for v in obj.values():
                _strip_pass_threshold(v)
        elif isinstance(obj, list):
            for v in obj:
                _strip_pass_threshold(v)

    _strip_pass_threshold(data)

    gtype = data.get("type")
    if not gtype:
        raise ValueError("Saved grader JSON lacks 'type' field – cannot determine class")

    cls = _grader_class_for_type(gtype)
    try:
        return cls(**data)  # type: ignore[arg-type]
    except Exception as exc:
        print(
            f"[grader_utils] Warning: Could not instantiate {cls.__name__} – "
            f"returning raw data instead."
        )
        if verbose:
            print(f"[grader_utils] Error: {exc}")
        return data 