from __future__ import annotations

import os
import shlex
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse


OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"


def load_local_env() -> None:
    for env_path in (Path(".env.local"), Path(".env")):
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text().splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            if not key or key in os.environ:
                continue

            os.environ[key] = shlex.split(value.strip())[0] if value.strip() else ""


load_local_env()

app = FastAPI(title="OpenAI Simulator Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/responses/stream")
async def stream_responses(request: Request) -> StreamingResponse:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Request body must be a JSON object")

    request_options = payload.get("request_options") or {}
    input_items = payload.get("input")

    if not isinstance(request_options, dict):
        raise HTTPException(status_code=400, detail="request_options must be an object")

    if input_items is None:
        raise HTTPException(status_code=400, detail="input is required")

    upstream_body = dict(request_options)
    upstream_body["input"] = input_items
    upstream_body["stream"] = True
    hydrate_server_side_tool_auth(upstream_body)

    response = await open_openai_stream(api_key, upstream_body)

    return StreamingResponse(
        stream_openai_events(response),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def hydrate_server_side_tool_auth(upstream_body: dict[str, Any]) -> None:
    linear_key = os.environ.get("LINEAR_API_KEY") or os.environ.get("VITE_LINEAR_API_KEY")

    for tool in upstream_body.get("tools") or []:
        if not isinstance(tool, dict):
            continue

        is_linear_mcp = tool.get("type") == "mcp" and tool.get("server_label") == "linear_mcp_server"
        if not is_linear_mcp:
            continue

        if linear_key:
            tool["authorization"] = linear_key
        else:
            tool.pop("authorization", None)


async def open_openai_stream(
    api_key: str,
    upstream_body: dict[str, Any],
) -> httpx.Response:
    client = httpx.AsyncClient(timeout=None)
    request = client.build_request(
        "POST",
        OPENAI_RESPONSES_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        },
        json=upstream_body,
    )
    response = await client.send(request, stream=True)
    response.extensions["openai_simulator_client"] = client

    if response.status_code >= 400:
        error_body = await response.aread()
        await response.aclose()
        await client.aclose()
        raise HTTPException(status_code=response.status_code, detail=error_body.decode())

    return response


async def stream_openai_events(response: httpx.Response) -> AsyncIterator[bytes]:
    client = response.extensions["openai_simulator_client"]
    try:
        async for chunk in response.aiter_bytes():
            yield chunk
    finally:
        await response.aclose()
        await client.aclose()
