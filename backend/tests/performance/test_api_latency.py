"""Performance and efficiency tests measuring p50/p95 response latencies under concurrent load."""

import asyncio
import statistics
import time
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_concurrent_api_latency_benchmarks(client: AsyncClient, test_db, sample_user):
    """Verify system efficiency and bounded p50/p95 latency across concurrent async operations."""
    # Seed test event with budget, tasks, and vendors
    ev_res = await test_db.events.insert_one(
        {
            "user_id": sample_user["id"],
            "name": "Benchmark Performance Gala",
            "event_type": "community",
            "event_date": (datetime.now(UTC) + timedelta(days=90)).isoformat(),
            "location": "Innovation Center",
            "expected_guest_count": 200,
            "total_budget": 20000.0,
            "currency": "USD",
            "status": "planning",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
    )
    event_id = str(ev_res.inserted_id)

    # Seed budget items
    await test_db.budget_items.insert_many(
        [
            {
                "event_id": event_id,
                "user_id": sample_user["id"],
                "category": "catering",
                "item_name": f"Buffet Tier {i}",
                "estimated_amount": 1000.0 * i,
                "actual_amount": 800.0 * i,
                "status": "planned",
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
            for i in range(1, 6)
        ]
    )

    # Endpoints to query concurrently
    endpoints = [
        f"/api/v1/events/{event_id}",
        f"/api/v1/events/{event_id}/budget",
        f"/api/v1/events/{event_id}/tasks",
        f"/api/v1/events/{event_id}/vendors",
        "/api/v1/events",
    ]

    latencies: list[float] = []

    async def timed_fetch(url: str) -> None:
        start = time.perf_counter()
        resp = await client.get(url, headers=sample_user["headers"])
        duration_ms = (time.perf_counter() - start) * 1000.0
        assert resp.status_code == 200
        latencies.append(duration_ms)

    # Dispatch 25 concurrent requests (5 batches of the 5 endpoints)
    tasks = [timed_fetch(ep) for _ in range(5) for ep in endpoints]
    await asyncio.gather(*tasks)

    assert len(latencies) == 25

    # Compute p50 (median) and p95 latency
    latencies.sort()
    p50 = statistics.median(latencies)
    p95_index = int(0.95 * len(latencies))
    p95 = latencies[p95_index]

    # Verify that async non-blocking execution keeps latencies well within targets
    assert p50 < 400.0, f"p50 latency too high: {p50:.2f}ms"
    assert p95 < 800.0, f"p95 latency too high: {p95:.2f}ms"
