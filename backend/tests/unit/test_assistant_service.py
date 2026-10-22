"""Unit tests for AssistantService intent parsing, deterministic math, and confirmation execution."""

from datetime import UTC, datetime, timedelta

import pytest
from bson import ObjectId

from app.core.errors import ValidationError
from app.schemas.assistant import AssistantMessageRequest
from app.services.assistant_service import AssistantService


@pytest.mark.asyncio
async def test_assistant_advisory_message(test_db, sample_user):
    """Test informational question returns helpful advice without requiring confirmation."""
    service = AssistantService(test_db)

    # Insert test event
    ev_res = await test_db.events.insert_one({
        "user_id": sample_user["id"],
        "name": "Maya's 30th Birthday",
        "event_type": "birthday",
        "event_date": (datetime.now(UTC) + timedelta(days=30)).isoformat(),
        "location": "Rooftop Lounge, Chicago",
        "expected_guest_count": 50,
        "total_budget": 5000.0,
        "currency": "USD",
        "created_at": datetime.now(UTC),
    })
    event_id = str(ev_res.inserted_id)

    req = AssistantMessageRequest(prompt="What are some good favor ideas for guests?", force_fallback=True)
    resp = await service.handle_message(event_id, sample_user["id"], req)

    assert resp.requires_confirmation is False
    assert resp.proposal_id is None
    assert "favor" in resp.reply.lower() or "plantable" in resp.reply.lower()
    assert resp.is_fallback is True


@pytest.mark.asyncio
async def test_assistant_budget_reallocation_proposal(test_db, sample_user):
    """Test natural language budget reallocation parses exact categories and proportional amounts."""
    service = AssistantService(test_db)

    # Insert event with initial budget item
    ev_res = await test_db.events.insert_one({
        "user_id": sample_user["id"],
        "name": "Sarah & Tom Wedding",
        "event_type": "wedding",
        "event_date": (datetime.now(UTC) + timedelta(days=90)).isoformat(),
        "location": "Vineyard Manor",
        "expected_guest_count": 100,
        "total_budget": 20000.0,
        "currency": "USD",
        "created_at": datetime.now(UTC),
    })
    event_id = str(ev_res.inserted_id)

    # Existing catering item of $8000
    await test_db.budget_items.insert_one({
        "event_id": event_id,
        "user_id": sample_user["id"],
        "category": "catering",
        "item_name": "Full Buffet & Drinks",
        "estimated_amount": 8000.0,
        "actual_amount": 0.0,
        "status": "planned",
        "created_at": datetime.now(UTC),
    })

    req = AssistantMessageRequest(
        prompt="Reduce catering budget by 10% and allocate to photography",
        force_fallback=True,
    )
    resp = await service.handle_message(event_id, sample_user["id"], req)

    assert resp.requires_confirmation is True
    assert resp.proposal_id is not None
    assert resp.proposed_changes is not None
    assert len(resp.proposed_changes.budget_adjustments) == 2

    # 10% of 8000 = 800
    adj_dec = resp.proposed_changes.budget_adjustments[0]
    adj_inc = resp.proposed_changes.budget_adjustments[1]

    assert adj_dec.category == "catering"
    assert adj_dec.delta == -800.0
    assert adj_inc.category == "photography"
    assert adj_inc.delta == 800.0


@pytest.mark.asyncio
async def test_assistant_task_scheduling_proposal(test_db, sample_user):
    """Test task scheduling intent parses title, priority, and days-before date calculation."""
    service = AssistantService(test_db)

    target_date = datetime.now(UTC) + timedelta(days=60)
    ev_res = await test_db.events.insert_one({
        "user_id": sample_user["id"],
        "name": "Tech Meetup Gala",
        "event_type": "community",
        "event_date": target_date.isoformat(),
        "location": "Convention Hall",
        "expected_guest_count": 250,
        "total_budget": 15000.0,
        "currency": "USD",
        "created_at": datetime.now(UTC),
    })
    event_id = str(ev_res.inserted_id)

    req = AssistantMessageRequest(
        prompt="Add high priority task to book audio equipment 2 weeks before event",
        force_fallback=True,
    )
    resp = await service.handle_message(event_id, sample_user["id"], req)

    assert resp.requires_confirmation is True
    assert resp.proposal_id is not None
    assert resp.proposed_changes is not None
    assert len(resp.proposed_changes.task_additions) == 1

    task_diff = resp.proposed_changes.task_additions[0]
    assert "audio equipment" in task_diff.title.lower() or "book" in task_diff.title.lower()
    assert task_diff.priority == "high"


@pytest.mark.asyncio
async def test_assistant_confirm_proposal_executes_changes(test_db, sample_user):
    """Test confirming a proposal persists all budget, task, and event changes and marks proposal applied."""
    service = AssistantService(test_db)

    ev_res = await test_db.events.insert_one({
        "user_id": sample_user["id"],
        "name": "Community Art Fair",
        "event_type": "community",
        "event_date": (datetime.now(UTC) + timedelta(days=40)).isoformat(),
        "location": "Community Center",
        "expected_guest_count": 80,
        "total_budget": 5000.0,
        "currency": "USD",
        "created_at": datetime.now(UTC),
    })
    event_id = str(ev_res.inserted_id)

    # Generate a task addition proposal
    req = AssistantMessageRequest(prompt="Add task to print event flyers 10 days before event", force_fallback=True)
    resp = await service.handle_message(event_id, sample_user["id"], req)
    proposal_id = resp.proposal_id
    assert proposal_id is not None

    # Confirm the proposal
    confirm_res = await service.confirm_proposal(event_id, proposal_id, sample_user["id"], confirmed=True)
    assert confirm_res.applied is True
    assert confirm_res.tasks_created == 1

    # Verify task exists in db
    tasks = await test_db.tasks.find({"event_id": event_id}).to_list(length=10)
    assert len(tasks) == 1
    assert "flyers" in tasks[0]["title"].lower() or "print" in tasks[0]["title"].lower()

    # Verify proposal cannot be confirmed twice
    with pytest.raises(ValidationError):
        await service.confirm_proposal(event_id, proposal_id, sample_user["id"], confirmed=True)


@pytest.mark.asyncio
async def test_assistant_dismiss_proposal(test_db, sample_user):
    """Test dismissing proposal marks it dismissed without applying any entities."""
    service = AssistantService(test_db)

    ev_res = await test_db.events.insert_one({
        "user_id": sample_user["id"],
        "name": "Birthday Party",
        "event_type": "birthday",
        "event_date": (datetime.now(UTC) + timedelta(days=20)).isoformat(),
        "location": "Bowling Alley",
        "expected_guest_count": 25,
        "total_budget": 1200.0,
        "currency": "USD",
        "created_at": datetime.now(UTC),
    })
    event_id = str(ev_res.inserted_id)

    req = AssistantMessageRequest(prompt="Change guest count to 40", force_fallback=True)
    resp = await service.handle_message(event_id, sample_user["id"], req)
    proposal_id = resp.proposal_id
    assert proposal_id is not None

    confirm_res = await service.confirm_proposal(event_id, proposal_id, sample_user["id"], confirmed=False)
    assert confirm_res.applied is False
    assert confirm_res.message == "Proposal successfully dismissed."

    # Verify event guest count unchanged
    ev = await test_db.events.find_one({"_id": ObjectId(event_id)})
    assert ev["expected_guest_count"] == 25
