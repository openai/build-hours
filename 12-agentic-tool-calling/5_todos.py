import uuid, asyncio, json
from dataclasses import dataclass, field
from typing import Any, Dict, List
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from agents import Runner, function_tool, RunContextWrapper
from utils import encode_sse
from server_agents import agent


async def publish(ev: str, data: dict):
    """Push one frame to the global feed."""
    await events_q.put(encode_sse(ev, data))


@dataclass
class Task:
    id: str
    items: List[Any]
    todos: List[dict] = field(default_factory=list)
    status: str = "running"


tasks: Dict[str, Task] = {}
events_q: asyncio.Queue[bytes] = asyncio.Queue()
app = FastAPI()


@function_tool
async def add_todo(wrapper: RunContextWrapper[Task], texts: list[str]) -> dict:
    """
    Add multiple todo items to the task. Each todo is published separately.
    Keep each todo to 4-8 words.
    """
    todos = []
    for t in texts:
        todo = {
            "id": uuid.uuid4().hex,
            "status": "idle",
            "text": t,
        }
        wrapper.context.todos.append(todo)
        print(f"Added todo: {todo} to task: {wrapper.context.id}")
        await publish(
            "task.updated",
            {
                "task_id": wrapper.context.id,
                "event": {"type": "todo.added", "todo": todo},
            },
        )
        todos.append(todo)
    return {"todos": todos}


@function_tool
async def set_todo_status(
    wrapper: RunContextWrapper[Task], todo_id: str, status: str
) -> dict:
    """Set the status of a todo item."""
    for todo in wrapper.context.todos:  # find todo
        if todo.get("id") == todo_id:
            todo["status"] = status
            break
    await publish(
        "task.updated",
        {
            "task_id": wrapper.context.id,
            "event": {"type": "todo.status", "todoId": todo_id, "status": status},
        },
    )
    return {"status": "success"}


agent.tools += [add_todo, set_todo_status]


async def worker(task: Task, prev_id):
    run = Runner.run_streamed(
        agent,
        input=task.items,
        previous_response_id=prev_id,
        context=task,
        max_turns=100,
    )
    async for ev in run.stream_events():
        if ev.type == "raw_response_event":
            await publish(
                "task.updated",
                {"task_id": task.id, "event": ev.data.to_dict()},
            )

    task.status = "done"
    await publish("task.updated", {"task_id": task.id, "status": "done"})


@app.post("/tasks")
async def post_create_task(req: Request):
    body = await req.json()
    items = body.get("items", [])
    previous_response_id = body.get("previousResponseId")

    # create & publish task object
    t = Task(id=uuid.uuid4().hex, items=items)
    tasks[t.id] = t
    await publish("task.created", {"task": {"id": t.id}})

    asyncio.create_task(worker(t, previous_response_id))  # asyncio task
    return {"task_id": t.id}


@app.get("/events")  # single SSE feed
async def get_events(req: Request):
    async def gen():
        while True:
            chunk = await events_q.get()
            yield chunk
            if await req.is_disconnected():
                break

    return StreamingResponse(gen(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("5_todos:app", host="0.0.0.0", port=8000, reload=True)
