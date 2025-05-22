from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from utils import encode_sse, to_dict
from agents import Runner
import uvicorn
from server_agents import agent

app = FastAPI()


@app.post("/")
async def endpoint(request: Request):
    body = await request.json()

    async def event_stream():
        run = Runner.run_streamed(
            agent,
            input=body.get("items", []),
            previous_response_id=body.get("previousResponseId"),
        )
        async for ev in run.stream_events():
            if ev.type == "raw_response_event":
                yield encode_sse(ev.type, to_dict(ev.data))
        yield encode_sse("done", {})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
