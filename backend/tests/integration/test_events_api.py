"""Integration tests for Event CRUD and cascade delete API endpoints."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_event_crud_lifecycle(client: AsyncClient, sample_user):
    """Verify complete CRUD lifecycle for an event."""
    headers = sample_user["headers"]
    target_date = (datetime.now(UTC) + timedelta(days=45)).isoformat()

    # 1. CREATE EVENT
    create_payload = {
        "name": "Summer Beach Wedding",
        "event_type": "wedding",
        "event_date": target_date,
        "location": "Sunset Bay Resort",
        "expected_guest_count": 120,
        "total_budget": 350000.0,
        "currency": "INR",
        "theme": "Tropical Sunset",
        "preferences": "Fresh seafood, acoustic reggae band",
        "special_requirements": "Ramp access for elderly guests",
    }
    res = await client.post("/api/v1/events", json=create_payload, headers=headers)
    assert res.status_code == 201
    event = res.json()
    assert event["id"] is not None
    assert event["name"] == "Summer Beach Wedding"
    assert event["status"] == "planning"
    eid = event["id"]

    # 2. LIST EVENTS
    res_list = await client.get("/api/v1/events", headers=headers)
    assert res_list.status_code == 200
    events = res_list.json()
    assert len(events) >= 1
    assert any(e["id"] == eid for e in events)

    # 3. GET SINGLE EVENT DETAIL
    res_get = await client.get(f"/api/v1/events/{eid}", headers=headers)
    assert res_get.status_code == 200
    detail = res_get.json()
    assert detail["id"] == eid
    assert "stats" in detail
    assert detail["stats"]["budget_allocated"] == 0.0

    # 4. UPDATE EVENT
    res_update = await client.put(
        f"/api/v1/events/{eid}",
        json={"location": "Palm Beach Resort & Spa", "total_budget": 400000.0},
        headers=headers,
    )
    assert res_update.status_code == 200
    updated = res_update.json()
    assert updated["location"] == "Palm Beach Resort & Spa"
    assert updated["total_budget"] == 400000.0

    # 5. CASCADE DELETION
    # Add child items first to verify cascade
    await client.post(
        f"/api/v1/events/{eid}/budget",
        json={"category": "venue", "item_name": "Resort Lawn", "estimated_amount": 100000.0},
        headers=headers,
    )
    await client.post(
        f"/api/v1/events/{eid}/tasks",
        json={"title": "Confirm Booking", "due_date": target_date},
        headers=headers,
    )

    # Delete event
    res_del = await client.delete(f"/api/v1/events/{eid}", headers=headers)
    assert res_del.status_code == 200

    # Verify event no longer exists
    res_after = await client.get(f"/api/v1/events/{eid}", headers=headers)
    assert res_after.status_code == 404

    # Verify child items are cascaded
    res_budget = await client.get(f"/api/v1/events/{eid}/budget", headers=headers)
    assert res_budget.status_code == 404
