import json
import dataclasses
from agents import Agent, Runner
from openai.types.responses import (
    ResponseOutputItemAddedEvent,
    ResponseOutputItemDoneEvent,
    ResponseCompletedEvent,
)
import asyncio
import json
import dataclasses
from fastapi import Request
from typing import Callable, Dict, Any, List
from functools import wraps
import inspect
from openai import OpenAI

COLOR_MAP = {
    "red": "31",
    "green": "32",
    "yellow": "33",
    "blue": "34",
    "magenta": "35",
    "cyan": "36",
    "white": "37",
    "gray": "90",
    "reset": "0",
}


def color(text, color_name):
    color_code = COLOR_MAP.get(color_name, COLOR_MAP["reset"])
    return f"\033[{color_code}m{text}\033[0m"


def run_demo_loop(agent: Agent):
    import sys

    async def main():
        previous_response_id = None
        while True:
            try:
                user_input = input("> ")
            except (EOFError, KeyboardInterrupt):
                print("\nExiting.")
                break
            if user_input.strip().lower() in {"exit", "quit"}:
                print("Exiting.")
                break
            run = Runner.run_streamed(
                agent,
                input=user_input,
                previous_response_id=previous_response_id,
            )
            try:
                async for ev in run.stream_events():
                    if ev.type == "raw_response_event":
                        if isinstance(ev.data, ResponseOutputItemAddedEvent):
                            handle_event_added(ev.data)
                        elif isinstance(ev.data, ResponseOutputItemDoneEvent):
                            handle_event_done(ev.data)
                        elif isinstance(ev.data, ResponseCompletedEvent):
                            previous_response_id = ev.data.response.id
            except (EOFError, KeyboardInterrupt):
                print("\nExiting.")
                break

    try:
        asyncio.run(main())
    except (KeyboardInterrupt, EOFError):
        print("\nExiting.")


def handle_event_added(event: ResponseOutputItemAddedEvent):
    item = event.item
    if item.type == "reasoning":
        print(color("Reasoning...", "gray"), "\n".join(item.summary))


def handle_event_done(event: ResponseOutputItemDoneEvent):
    item = event.item

    if item.type == "message":
        print(color("Assistant:", "blue"), item.content[0].text)
    elif item.type == "function_call":
        name = color(item.name, "magenta")
        args = item.arguments[1:-1]
        print(f"{name}({args})")


def to_dict(obj):
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if dataclasses.is_dataclass(obj):
        return dataclasses.asdict(obj)
    return getattr(obj, "__dict__", str(obj))


def encode_sse(ev: str, data: dict) -> bytes:
    return f"event: {ev}\ndata:{json.dumps(data)}\n\n".encode()


async def event_stream(q: asyncio.Queue[bytes], req: Request):
    while True:
        chunk = await q.get()
        yield chunk
        if chunk.startswith(b"event: done") or await req.is_disconnected():
            break


_HALLUCINATE_HISTORY = []


def fn_to_schema(fn) -> Dict[str, Any]:
    """
    Build a minimal function‑tool schema from a python callable.
    All parameters are typed as string for brevity.
    """
    props = {p: {"type": "string"} for p in inspect.signature(fn).parameters}
    docstring = inspect.getdoc(fn) or ""
    return {
        "type": "function",
        "name": fn.__name__,
        "description": docstring,
        "parameters": {
            "type": "object",
            "properties": props,
            "required": list(props),
            "additionalProperties": True,
        },
    }


def _hallucinated_response(
    fn_name: str,
    fn_schema: Dict[str, Any],
    args: Dict[str, Any],
    prev_calls: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Ask the model to fake the function’s output (JSON mode)."""
    client = OpenAI()
    response = client.responses.create(
        model="gpt-4.1-mini",
        input=[
            {
                "role": "developer",
                "content": (
                    "Emulate the function call below. "
                    "You are given the function's JSON schema, the arguments, "
                    "and a history of prior calls. Respond with a JSON object "
                    "representing the function's return value."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "function_schema": fn_schema,
                        "function_name": fn_name,
                        "args": args,
                        "previous_function_calls": prev_calls,
                    },
                    indent=2,
                ),
            },
        ],
        text={"format": {"type": "json_object"}},
        reasoning={"effort": "low"},
    )

    output_text = "".join(
        part.text
        for item in response.output
        if item.type == "message"
        for part in item.content
        if part.type == "output_text"
    )
    return json.loads(output_text or "{}")


def hallucinate(fn: Callable) -> Callable:
    """
    Decorator that swaps the real implementation for an LLM‑generated one.
    Uses a **single, module‑level history list** shared by all hallucinated fns.
    """
    schema = fn_to_schema(fn)  # build once

    @wraps(fn)
    def wrapper(*args, **kwargs):
        arg_names = fn.__code__.co_varnames[: fn.__code__.co_argcount]
        arg_dict = {**dict(zip(arg_names, args)), **kwargs}

        result = _hallucinated_response(
            fn.__name__, schema, arg_dict, _HALLUCINATE_HISTORY
        )

        _HALLUCINATE_HISTORY.append(
            {
                "name": fn.__name__,
                "schema": schema,
                "args": arg_dict,
                "returned": result,
            }
        )
        return result

    return wrapper
