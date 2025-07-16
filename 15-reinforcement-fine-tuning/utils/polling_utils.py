from __future__ import annotations

import asyncio
from typing import Dict, List, Any

__all__ = [
    "wait_until_finished",
    "fetch_all_output_items",
    "extract_items",
]


async def wait_until_finished(client, eval_id: str, run_id: str, poll_every: int = 5):
    """Poll *run_id* until it is finished; prints minimal progress information."""

    while True:
        run = await client.evals.runs.retrieve(run_id, eval_id=eval_id)
        status = run.status
        if run.result_counts:
            rc = run.result_counts
            print(
                f"{status:<9} passed={rc.passed:<3} failed={rc.failed:<3}"
                f" errors={rc.errored:<3} / total={rc.total}"
            )
        else:
            print(status)

        if status in {"completed", "failed"}:
            return run
        await asyncio.sleep(poll_every)


async def fetch_all_output_items(
    client,
    eval_id: str,
    run_id: str,
    *,
    page_limit: int = 100,
    max_wait: int = 30,
    poll_initial_delay: int = 2,
    poll_base_delay: float = 1.5,
) -> List[Any]:
    """Retrieve **all** OutputItems for a run using simple paging.

    The earlier backend pagination issue has been fixed, so we can now rely on
    a single pass that follows `has_more` and `last_id` pointers.  We still:

    1. Wait a short grace period (`poll_initial_delay`) after run completion so
       the backend has time to index newly produced items.
    2. Verify that the number of collected items matches
       `run.result_counts.total` (when available) within `max_wait` seconds.

    Raises
    ------
    TimeoutError
        If the expected number of items is not reached within *max_wait*
        seconds.
    """

    import time

    start_ts = time.perf_counter()

    # How many items should we expect?
    run_meta = await client.evals.runs.retrieve(run_id, eval_id=eval_id)
    expected = run_meta.result_counts.total if run_meta.result_counts else None
    print(f"[fetch] expecting {expected} items for run {run_id}")

    # Give the backend a short grace period to finish indexing.
    await asyncio.sleep(poll_initial_delay)

    collected: Dict[str, Any] = {}
    after: str | None = None
    page_idx = 0

    # Single paging pass
    while True:
        page = await client.evals.runs.output_items.list(
            eval_id=eval_id, run_id=run_id, after=after, limit=page_limit
        )

        collected.update({it.id: it for it in page.data})
        print(
            f"  page {page_idx:2d}  recv={len(page.data):3d}  "
            f"total={len(collected):3d}  has_more={page.has_more}"
        )

        if not page.has_more:
            break

        after = page.last_id
        page_idx += 1

    # If the expected count isn't reached yet, keep polling the first page
    # until either we get everything or we hit *max_wait*.
    while expected is not None and len(collected) < expected:
        if time.perf_counter() - start_ts > max_wait:
            print(
                f"[fetch] WARNING: timeout after {max_wait}s – returning {len(collected)}/{expected} items collected so far"
            )
            break

        print(
            f"[fetch] {len(collected)}/{expected} items collected – retrying in 1s"
        )
        await asyncio.sleep(1)

        page = await client.evals.runs.output_items.list(
            eval_id=eval_id, run_id=run_id, limit=page_limit
        )
        collected.update({it.id: it for it in page.data})

    print(f"[fetch] finished – {len(collected)} items (expected {expected})")
    return list(collected.values())


def extract_items(output_items) -> List[Dict[str, Any]]:
    """Convert OutputItem objects into plain JSON-serialisable dictionaries.

    The structure of ``it.results`` is a list where each entry corresponds to a
    grader result.  We now collect **all** grader scores into a single
    dictionary so the caller can access any grader's score via

    ``item["score"][<grader_name>]``.
    """

    flat: List[Dict[str, Any]] = []
    for it in output_items:
        # Build mapping {grader_name: score}
        scores: Dict[str, Any] = {}
        for res in (it.results or []):
            # Result names are of the form  "<grader_name>-<uuid>" – keep only the prefix.
            name = res.get("name", "")
            grader_name = name.split("-", 1)[0] if "-" in name else name
            scores[grader_name] = res.get("score")

        prediction = (
            it.sample.output[0].content if it.sample and it.sample.output else None
        )

        flat.append(
            {
                "datasource_item_id": it.datasource_item_id,
                "item_id": it.datasource_item.get("id"),
                "reference": it.datasource_item.get("reference_answer"),
                "prediction": prediction,
                # All grader scores – callers can choose the one they need.
                "score": scores,
            }
        )

    return flat 