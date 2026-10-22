"""Integration tests for Task and Timeline management endpoints."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_tasks_api_lifecycle(client: AsyncClient, sample_user):
    """Verify create, get, update, and reschedule tasks API endpoints."""
    headers = sample_user["headers"]
    now = datetime.now(UTC)
    event_date = now + timedelta(days=25)

    # 1. Create Event
    evt = await client.post(
        "/api/v1/events",
        json={
            "name": "Timeline Task Event",
            "event_type": "wedding",
            "event_date": event_date.isoformat(),
            "location": "Hilltop Chapel",
            "expected_guest_count": 80,
            "total_budget": 150000.0,
            "currency": "INR",
        },
        headers=headers,
    )
    assert evt.status_code == 201
    eid = evt.json()["id"]

    # 2. Create Task 1
    t1_due = (now + timedelta(days=5)).isoformat()
    res_t1 = await client.post(
        f"/api/v1/events/{eid}/tasks",
        json={
            "title": "Select Music Playlist",
            "category": "entertainment",
            "due_date": t1_due,
            "priority": "high",
        },
        headers=headers,
    )
    assert res_t1.status_code == 201
    t1_id = res_t1.json()["id"]

    # 3. Create Task 2
    t2_due = (now + timedelta(days=10)).isoformat()
    res_t2 = await client.post(
        f"/api/v1/events/{eid}/tasks",
        json={
            "title": "Finalize Guest Seating",
            "category": "logistics",
            "due_date": t2_due,
            "priority": "urgent",
            "dependencies": [t1_id],
        },
        headers=headers,
    )
    assert res_t2.status_code == 201
    t2_id = res_t2.json()["id"]

    # 4. List Tasks
    res_list = await client.get(f"/api/v1/events/{eid}/tasks", headers=headers)
    assert res_list.status_code == 200
    task_data = res_list.json()
    assert task_data["total_tasks"] == 2
    assert task_data["completed_tasks"] == 0

    # 5. Complete Task 1
    res_up1 = await client.put(
        f"/api/v1/events/{eid}/tasks/{t1_id}",
        json={"status": "completed"},
        headers=headers,
    )
    assert res_up1.status_code == 200
    assert res_up1.json()["status"] == "completed"

    # 6. Reschedule Timeline (+15 days)
    new_date = (event_date + timedelta(days=15)).isoformat()
    res_reschedule = await client.post(
        f"/api/v1/events/{eid}/tasks/reschedule",
        json={"new_event_date": new_date, "preserve_completed": True},
        headers=headers,
    )
    assert res_reschedule.status_code == 200
    rescheduled_data = res_reschedule.json()
    assert rescheduled_data["total_tasks"] == 2
    # Verify completed task 1 was preserved
    res_comp = next(t for t in rescheduled_data["tasks"] if t["id"] == t1_id)
    assert res_comp["status"] == "completed"

    # 7. Delete Task 2
    res_del = await client.delete(f"/api/v1/events/{eid}/tasks/{t2_id}", headers=headers)
    assert res_del.status_code == 200
