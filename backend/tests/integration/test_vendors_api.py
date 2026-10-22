"""Integration tests for Vendor Checklist API endpoints."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_vendors_api_lifecycle(client: AsyncClient, sample_user):
    """Verify vendor item addition, category grouping, booking status updates, and deletions."""
    headers = sample_user["headers"]

    # 1. Create Event
    evt = await client.post(
        "/api/v1/events",
        json={
            "name": "Vendor API Event",
            "event_type": "wedding",
            "event_date": (datetime.now(UTC) + timedelta(days=40)).isoformat(),
            "location": "Resort",
            "expected_guest_count": 100,
            "total_budget": 200000.0,
            "currency": "INR",
        },
        headers=headers,
    )
    assert evt.status_code == 201
    eid = evt.json()["id"]

    # 2. Add Vendor Item
    res_add = await client.post(
        f"/api/v1/events/{eid}/vendors",
        json={
            "category": "catering",
            "item_name": "Gourmet Flavors Catering",
            "quotation_amount": 120000.0,
            "booking_status": "quoted",
            "payment_status": "unpaid",
            "notes": "Includes live pasta counter",
            "contact_info": "chef@gourmetflavors.com",
        },
        headers=headers,
    )
    assert res_add.status_code == 201
    v_id = res_add.json()["id"]

    # 3. List Vendors
    res_list = await client.get(f"/api/v1/events/{eid}/vendors", headers=headers)
    assert res_list.status_code == 200
    v_data = res_list.json()
    assert v_data["total_vendors"] == 1
    assert v_data["booked_count"] == 0
    assert v_data["total_quoted_amount"] == 120000.0
    assert "catering" in v_data["items_by_category"]

    # 4. Update Vendor (mark as booked and partially paid)
    res_up = await client.put(
        f"/api/v1/events/{eid}/vendors/{v_id}",
        json={"booking_status": "booked", "payment_status": "partially_paid"},
        headers=headers,
    )
    assert res_up.status_code == 200
    assert res_up.json()["booking_status"] == "booked"

    # 5. Delete Vendor
    res_del = await client.delete(f"/api/v1/events/{eid}/vendors/{v_id}", headers=headers)
    assert res_del.status_code == 200

    # 6. Verify empty after delete
    res_after = await client.get(f"/api/v1/events/{eid}/vendors", headers=headers)
    assert res_after.status_code == 200
    assert res_after.json()["total_vendors"] == 0
