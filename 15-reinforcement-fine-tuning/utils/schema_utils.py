from __future__ import annotations

import json
import pathlib
from typing import Dict, Any

__all__ = ["infer_item_schema"]


def infer_item_schema(dataset_path: pathlib.Path, sample_lines: int = 1) -> Dict[str, Any]:
    """Infer a minimal JSON schema from *dataset_path* (JSONL) using the first line(s).

    This introspects primitive types and maps them to JSON schema type names. The
    function is intentionally simple – for complex datasets consider using a
    full-featured schema library.
    """

    type_map = {
        str: "string",
        int: "number",
        float: "number",
        list: "array",
        dict: "object",
        bool: "boolean",
    }
    props: Dict[str, Any] = {}
    required: set[str] = set()

    with dataset_path.open() as f:
        for _ in range(sample_lines):
            raw_line = f.readline()
            if not raw_line:
                break
            raw_json = json.loads(raw_line)
            item = raw_json.get("item", raw_json)
            for key, val in item.items():
                props[key] = {"type": type_map.get(type(val), "string")}
                required.add(key)

    return {"type": "object", "properties": props, "required": sorted(required)} 