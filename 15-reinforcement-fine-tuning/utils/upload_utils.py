from __future__ import annotations

import json
import pathlib
from typing import Dict, Any

from utils.project_paths import project_root

import hashlib

_CACHE_PATH = project_root() / "data" / ".file_cache.json"


def _load_cache() -> Dict[str, Any]:
    """Return cache mapping from absolute path -> {"hash": str, "file_id": str}"""

    if _CACHE_PATH.exists():
        try:
            data = json.loads(_CACHE_PATH.read_text())
            # Backwards-compat: old format was {path: file_id}
            if data and isinstance(next(iter(data.values())), str):
                data = {k: {"hash": None, "file_id": v} for k, v in data.items()}
            return data
        except json.JSONDecodeError:
            # Corrupt cache → start fresh
            return {}
    return {}


def _save_cache(cache: Dict[str, Any]) -> None:
    _CACHE_PATH.write_text(json.dumps(cache, indent=2))


async def get_or_upload_file(client, path: pathlib.Path, *, purpose: str = "evals") -> str:
    """Return OpenAI file_id for *path*; upload if not cached."""
    cache = _load_cache()
    fname = str(path.resolve())

    # Compute SHA-256 of current file
    hasher = hashlib.sha256()
    with path.open("rb") as f_bin:
        while True:
            chunk = f_bin.read(8192)
            if not chunk:
                break
            hasher.update(chunk)
    current_hash = hasher.hexdigest()

    entry = cache.get(fname)

    if entry and entry.get("hash") == current_hash and entry.get("file_id"):
        file_id = entry["file_id"]
        print(f"[dataset] Reusing cached file_id {file_id} for {path.name}")
        return file_id

    # Need to upload (new file or content changed)
    if entry:
        print(f"[dataset] Content changed – uploading new version of {path.name} …")
    else:
        print(f"[dataset] Uploading {path.name} → OpenAI Files API …")

    file_obj = await client.files.create(file=path, purpose=purpose)
    file_id = file_obj.id
    cache[fname] = {"hash": current_hash, "file_id": file_id}
    _save_cache(cache)
    return file_id