"""Integration tests for AI Plan Generation, Application, and Multi-Tenant Isolation."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient

UTC = UTC


@pytest.mark.asyncio
async def test_ai_plan_generate_and_apply_flow(client: AsyncClient, sample_user):
    """Full lifecycle: Create event -> Generate AI Plan -> Review & Apply -> Verify populated entities."""
    auth_headers = {"Authorization": f"Bearer {sample_user['token']}"}

    # 1. Create Event
    event_payload = {
        "name": "Maya & Carlos Botanical Wedding",
        "event_type": "wedding",
        "event_date": (datetime.now(UTC) + timedelta(days=90)).isoformat(),
        "location": "Botanical Pavilion, Seattle",
        "expected_guest_count": 80,
        "total_budget": 20000.0,
        "theme": "Lush Greenery & Brass",
        "preferences": "Vegetarian heavy menu, acoustic jazz",
        "special_requirements": "Ramp access for elderly guests",
    }
    create_res = await client.post("/api/v1/events", json=event_payload, headers=auth_headers)
    assert create_res.status_code == 201
    event_id = create_res.json()["id"]

    # 2. Generate Plan
    gen_res = await client.post(
        f"/api/v1/events/{event_id}/generate-plan",
        json={"force_fallback": True},
        headers=auth_headers,
    )
    assert gen_res.status_code == 200
    plan_data = gen_res.json()

    assert plan_data["event_id"] == event_id
    assert "Maya & Carlos Botanical Wedding" in plan_data["summary"]
    assert len(plan_data["budget_allocations"]) > 0
    assert len(plan_data["planning_tasks"]) > 0
    assert len(plan_data["vendor_categories"]) > 0

    # 3. Apply Plan
    apply_res = await client.post(
        f"/api/v1/events/{event_id}/apply-plan",
        json={"proposal": plan_data, "replace_existing": False},
        headers=auth_headers,
    )
    assert apply_res.status_code == 201
    applied_data = apply_res.json()
    assert applied_data["budget_items_created"] == len(plan_data["budget_allocations"])
    assert applied_data["tasks_created"] == len(plan_data["planning_tasks"])
    assert applied_data["vendors_created"] == len(plan_data["vendor_categories"])

    # 4. Verify entities populated via their dedicated endpoints
    budget_res = await client.get(f"/api/v1/events/{event_id}/budget", headers=auth_headers)
    assert budget_res.status_code == 200
    assert len(budget_res.json()["items"]) == applied_data["budget_items_created"]

    tasks_res = await client.get(f"/api/v1/events/{event_id}/tasks", headers=auth_headers)
    assert tasks_res.status_code == 200
    assert len(tasks_res.json()["tasks"]) == applied_data["tasks_created"]

    vendors_res = await client.get(f"/api/v1/events/{event_id}/vendors", headers=auth_headers)
    assert vendors_res.status_code == 200
    assert len(vendors_res.json()["items"]) == applied_data["vendors_created"]


@pytest.mark.asyncio
async def test_ai_plan_cross_user_isolation(client: AsyncClient, sample_user, other_user):
    """Ensure another user cannot generate or apply a plan for someone else's event (BOLA/IDOR)."""
    owner_headers = {"Authorization": f"Bearer {sample_user['token']}"}
    attacker_headers = {"Authorization": f"Bearer {other_user['token']}"}

    # Create event as owner
    create_res = await client.post(
        "/api/v1/events",
        json={
            "name": "Private VIP Gala",
            "event_type": "community",
            "event_date": (datetime.now(UTC) + timedelta(days=45)).isoformat(),
            "location": "Downtown Center",
            "expected_guest_count": 100,
            "total_budget": 15000.0,
        },
        headers=owner_headers,
    )
    assert create_res.status_code == 201
    event_id = create_res.json()["id"]

    # Attempt generate plan as attacker
    attack_gen = await client.post(
        f"/api/v1/events/{event_id}/generate-plan",
        json={"force_fallback": True},
        headers=attacker_headers,
    )
    assert attack_gen.status_code == 404

    # Generate legitimate plan as owner
    owner_gen = await client.post(
        f"/api/v1/events/{event_id}/generate-plan",
        json={"force_fallback": True},
        headers=owner_headers,
    )
    assert owner_gen.status_code == 200
    plan_data = owner_gen.json()

    # Attempt apply plan as attacker
    attack_apply = await client.post(
        f"/api/v1/events/{event_id}/apply-plan",
        json={"proposal": plan_data},
        headers=attacker_headers,
    )
    assert attack_apply.status_code == 404
