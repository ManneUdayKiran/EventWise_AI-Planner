"""Integration tests for Assistant API endpoints and multi-tenant security verification."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_assistant_api_message_and_confirm_flow(client: AsyncClient, test_db, sample_user):
    """Test full conversational message -> proposal -> confirmation lifecycle via HTTP endpoints."""
    # 1. Create Event
    ev_res = await test_db.events.insert_one(
        {
            "user_id": sample_user["id"],
            "name": "Spring Community Fair",
            "event_type": "community",
            "event_date": (datetime.now(UTC) + timedelta(days=45)).isoformat(),
            "location": "Town Square",
            "expected_guest_count": 150,
            "total_budget": 8000.0,
            "currency": "USD",
            "created_at": datetime.now(UTC),
        }
    )
    event_id = str(ev_res.inserted_id)

    # 2. Post Assistant Message
    msg_payload = {
        "prompt": "Reduce catering budget by 500 and allocate to photography",
        "force_fallback": True,
    }
    resp = await client.post(
        f"/api/v1/events/{event_id}/assistant",
        json=msg_payload,
        headers=sample_user["headers"],
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["requires_confirmation"] is True
    proposal_id = data["proposal_id"]
    assert proposal_id is not None
    assert len(data["proposed_changes"]["budget_adjustments"]) == 2

    # 3. Confirm Proposal
    confirm_resp = await client.post(
        f"/api/v1/events/{event_id}/assistant/{proposal_id}/confirm",
        json={"confirmed": True},
        headers=sample_user["headers"],
    )
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()
    assert confirm_data["applied"] is True
    assert confirm_data["budget_items_affected"] == 2

    # 4. Check Conversation History
    hist_resp = await client.get(
        f"/api/v1/events/{event_id}/assistant/history",
        headers=sample_user["headers"],
    )
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert len(history) >= 2
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_assistant_api_bola_isolation(client: AsyncClient, test_db, sample_user):
    """Test cross-tenant access to assistant returns 404 (IDOR/BOLA protection)."""
    # Event belonging to a different user
    ev_res = await test_db.events.insert_one(
        {
            "user_id": "other-user-999",
            "name": "Secret VIP Event",
            "event_type": "wedding",
            "event_date": (datetime.now(UTC) + timedelta(days=15)).isoformat(),
            "location": "Private Villa",
            "expected_guest_count": 50,
            "total_budget": 50000.0,
            "currency": "USD",
            "created_at": datetime.now(UTC),
        }
    )
    other_event_id = str(ev_res.inserted_id)

    resp = await client.post(
        f"/api/v1/events/{other_event_id}/assistant",
        json={"prompt": "Suggest decor", "force_fallback": True},
        headers=sample_user["headers"],
    )
    assert resp.status_code == 404
