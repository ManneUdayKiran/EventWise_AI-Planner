"""Security tests for Multi-Tenant Isolation and BOLA / IDOR protection."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_cross_user_access_blocked(client: AsyncClient, sample_user, other_user):
    """Verify User B cannot access, modify, or delete User A's events, budget, tasks, or vendors."""
    headers_a = sample_user["headers"]
    headers_b = other_user["headers"]
    now = datetime.now(UTC)

    # User A creates an event
    create_res = await client.post(
        "/api/v1/events",
        json={
            "name": "User A Private Secret Wedding",
            "event_type": "wedding",
            "event_date": (now + timedelta(days=60)).isoformat(),
            "location": "Confidential Island",
            "expected_guest_count": 50,
            "total_budget": 1000000.0,
            "currency": "INR",
        },
        headers=headers_a,
    )
    assert create_res.status_code == 201
    event_a_id = create_res.json()["id"]

    # User A adds a budget item
    b_res = await client.post(
        f"/api/v1/events/{event_a_id}/budget",
        json={
            "category": "venue",
            "item_name": "Island Booking",
            "estimated_amount": 500000.0,
        },
        headers=headers_a,
    )
    assert b_res.status_code == 201
    item_id = b_res.json()["id"]

    # User A adds a task
    t_res = await client.post(
        f"/api/v1/events/{event_a_id}/tasks",
        json={
            "title": "Private Jet Charter",
            "due_date": (now + timedelta(days=30)).isoformat(),
        },
        headers=headers_a,
    )
    assert t_res.status_code == 201
    task_id = t_res.json()["id"]

    # 1. User B attempts to GET User A's event -> 404 Not Found
    res = await client.get(f"/api/v1/events/{event_a_id}", headers=headers_b)
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

    # 2. User B attempts to UPDATE User A's event -> 404 Not Found
    res = await client.put(
        f"/api/v1/events/{event_a_id}",
        json={"name": "Attacker Hijacked Event"},
        headers=headers_b,
    )
    assert res.status_code == 404

    # 3. User B attempts to DELETE User A's event -> 404 Not Found
    res = await client.delete(f"/api/v1/events/{event_a_id}", headers=headers_b)
    assert res.status_code == 404

    # 4. User B attempts to GET User A's budget -> 404 Not Found
    res = await client.get(f"/api/v1/events/{event_a_id}/budget", headers=headers_b)
    assert res.status_code == 404

    # 5. User B attempts to POST into User A's budget -> 404 Not Found
    res = await client.post(
        f"/api/v1/events/{event_a_id}/budget",
        json={"category": "catering", "item_name": "Malicious Item", "estimated_amount": 100.0},
        headers=headers_b,
    )
    assert res.status_code == 404

    # 6. User B attempts to UPDATE User A's budget item -> 404 Not Found
    res = await client.put(
        f"/api/v1/events/{event_a_id}/budget/{item_id}",
        json={"actual_amount": 999999.0},
        headers=headers_b,
    )
    assert res.status_code == 404

    # 7. User B attempts to GET User A's tasks -> 404 Not Found
    res = await client.get(f"/api/v1/events/{event_a_id}/tasks", headers=headers_b)
    assert res.status_code == 404

    # 8. User B attempts to UPDATE User A's task -> 404 Not Found
    res = await client.put(
        f"/api/v1/events/{event_a_id}/tasks/{task_id}",
        json={"title": "Compromised Task"},
        headers=headers_b,
    )
    assert res.status_code == 404

    # 9. User B attempts to GET User A's vendors -> 404 Not Found
    res = await client.get(f"/api/v1/events/{event_a_id}/vendors", headers=headers_b)
    assert res.status_code == 404

    # Verify User A's event and data remain completely intact
    verify_res = await client.get(f"/api/v1/events/{event_a_id}", headers=headers_a)
    assert verify_res.status_code == 200
    assert verify_res.json()["name"] == "User A Private Secret Wedding"
