from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Optional

from .project_paths import prompts_root

import hashlib, json, os, pathlib

# cache file mapping md5(text) -> uuid
_CACHE_PATH = prompts_root() / ".prompt_ids.json"


def _load_cache():
    if _CACHE_PATH.exists():
        try:
            return json.loads(_CACHE_PATH.read_text())
        except Exception:
            return {}
    return {}


def _save_cache(cache):
    _CACHE_PATH.write_text(json.dumps(cache, indent=2))


@dataclass
class Prompt:
    """Lightweight container for prompt metadata (name + text)."""

    name: str
    text: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))


# ---------------------------------------------------------------------------
# Public helper to load prompts from disk
# ---------------------------------------------------------------------------

def load_prompt(dataset: str, prompt_name: str, prompt_type: str = "developer") -> Optional[Prompt]:
    """Load prompt markdown from ``prompts/<dataset>/<prompt_type>/<prompt_name>.md``.

    Returns None if the file does not exist.
    """
    md_path = prompts_root() / prompt_type / f"{prompt_name}.md"
    print(f"[prompt] looking for {md_path.relative_to(prompts_root().parent)}")
    print(prompts_root().parent)
    if md_path.exists():
        text = md_path.read_text(encoding="utf-8").strip()
        # compute stable id
        h = hashlib.md5(text.encode()).hexdigest()
        cache = _load_cache()
        if h not in cache:
            cache[h] = str(uuid.uuid4())
            _save_cache(cache)
        return Prompt(name=prompt_name, text=text, id=cache[h])
    return None


__all__ = ["Prompt", "load_prompt"] 