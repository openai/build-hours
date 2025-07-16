"""Path helpers that isolate artefacts per *customer*.

Usage
-----
At startup set the environment variable ``CUSTOMER`` (e.g. ``export CUSTOMER=toy``)
OR call :func:`set_customer` before importing helper modules that rely on it.

All shared utilities resolve their root folders through the functions defined
here, so nothing else needs to know the concrete folder structure.
"""

from __future__ import annotations

import os
import pathlib
from functools import lru_cache
from typing import Optional

# ---------------------------------------------------------------------------
# Project handling (single-level)
# ---------------------------------------------------------------------------

_BASE_DIR = pathlib.Path(__file__).resolve().parents[1]  # repo root
_PROJECT_ENV = "PROJECT"


def set_project(name: str) -> None:
    """Set the active project name programmatically (overrides env var)."""
    os.environ[_PROJECT_ENV] = name


def get_project() -> str:
    """Return the active project identifier (default: "default")."""
    return os.getenv(_PROJECT_ENV, "default")


@lru_cache(maxsize=None)
def project_root() -> pathlib.Path:
    """Absolute path to ``projects/<PROJECT>/`` directory."""
    root = _BASE_DIR / "projects" / get_project()
    root.mkdir(parents=True, exist_ok=True)
    return root


# ---------------------------------------------------------------------------
# Sub-folder helpers (all lazily created)
# ---------------------------------------------------------------------------

def prompts_root() -> pathlib.Path:
    p = project_root() / "prompts"
    p.mkdir(parents=True, exist_ok=True)
    return p


def datasets_root() -> pathlib.Path:
    p = project_root() / "data"
    p.mkdir(parents=True, exist_ok=True)
    return p


def eval_runs_root() -> pathlib.Path:
    p = project_root() / "eval_runs"
    p.mkdir(parents=True, exist_ok=True)
    return p


def graders_root() -> pathlib.Path:
    p = project_root() / "graders_saved"
    p.mkdir(parents=True, exist_ok=True)
    return p


# Structured outputs (per-customer Pydantic models)
def structured_outputs_root() -> pathlib.Path:
    p = project_root() / "structured_outputs"
    p.mkdir(parents=True, exist_ok=True)
    return p

__all__ = [
    "set_project",
    "get_project",
    "project_root",
    "prompts_root",
    "datasets_root",
    "eval_runs_root",
    "graders_root",
    "structured_outputs_root",
] 