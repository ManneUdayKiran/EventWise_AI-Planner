"""Integration tests for Budget endpoints and calculated balance metrics."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_budget_api_endpoints(client: AsyncClient, sample_user):
    """Verify add, get, update, and delete budget item endpoints."""
    headers = sample_user["headers"]

    # 1. Create an event
    evt_res = await client.post(
        "/api/v1/events",
        json={
            "name": "Budget Test Event",
            "event_type": "birthday",
            "event_date": (datetime.now(UTC) + timedelta(days=20)).isoformat(),
            "location": "Party Hall",
            "expected_guest_count": 50,
            "total_budget": 50000.0,
            "currency": "INR",
        },
        headers=headers,
    )
    assert evt_res.status_code == 201
    eid = evt_res.json()["id"]

    # 2. Add Budget Item 1: Catering
    res_b1 = await client.post(
        f"/api/v1/events/{eid}/budget",
        json={
            "category": "catering",
            "item_name": "Birthday Buffet",
            "estimated_amount": 25000.0,
            "actual_amount": 22000.0,
            "notes": "Includes mocktails",
        },
        headers=headers,
    )
    assert res_b1.status_code == 201
    b1_id = res_b1.json()["id"]

    # 3. Add Budget Item 2: Entertainment
    res_b2 = await client.post(
        f"/api/v1/events/{eid}/budget",
        json={
            "category": "entertainment",
            "item_name": "Live DJ Setup",
            "estimated_amount": 10000.0,
            "actual_amount": 10000.0,
        },
        headers=headers,
    )
    assert res_b2.status_code == 201

    # 4. Check Budget Summary
    res_sum = await client.get(f"/api/v1/events/{eid}/budget", headers=headers)
    assert res_sum.status_code == 200
    summary = res_sum.json()
    assert summary["total_budget"] == 50000.0
    assert summary["total_estimated"] == 35000.0
    assert summary["total_actual"] == 32000.0
    assert summary["remaining_budget"] == 18000.0
    # Cost per guest = 32000 / 50 = 640.0
    assert summary["cost_per_guest"] == 640.0
    # Utilization = (32000 / 50000) * 100 = 64.0%
    assert summary["utilization_percentage"] == 64.0
    assert summary["is_overspent"] is False
    assert "catering" in summary["items_by_category"]

    # 5. Update Budget Item 1 Actual Amount
    res_up = await client.put(
        f"/api/v1/events/{eid}/budget/{b1_id}",
        json={"actual_amount": 24000.0},
        headers=headers,
    )
    assert res_up.status_code == 200
    assert res_up.json()["actual_amount"] == 24000.0

    # 6. Delete Budget Item 1
    res_del = await client.delete(f"/api/v1/events/{eid}/budget/{b1_id}", headers=headers)
    assert res_del.status_code == 200

    # Verify summary after delete
    res_sum_after = await client.get(f"/api/v1/events/{eid}/budget", headers=headers)
    assert res_sum_after.status_code == 200
    assert res_sum_after.json()["total_actual"] == 10000.0
