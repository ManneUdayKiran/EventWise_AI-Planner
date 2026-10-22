"""Unit tests for deterministic budget calculations and business rules."""

from datetime import UTC, datetime

import pytest

from app.core.errors import ValidationError
from app.repositories.event_repo import EventRepository
from app.schemas.budget import BudgetCategory, BudgetItemCreate, BudgetItemStatus
from app.schemas.event import EventType
from app.services.budget_service import BudgetService


@pytest.mark.asyncio
async def test_budget_calculations_deterministic(test_db, sample_user):
    """Verify deterministic financial totals, remaining funds, utilization, and cost per guest."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "Math Precision Wedding",
            "event_type": EventType.WEDDING.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Grand Hall",
            "expected_guest_count": 100,
            "total_budget": 200000.0,
            "currency": "INR",
            "status": "planning",
        }
    )
    eid = event["id"]
    service = BudgetService(test_db)

    # Add 2 items
    await service.add_item(
        eid,
        sample_user["id"],
        BudgetItemCreate(
            category=BudgetCategory.CATERING,
            item_name="Main Course Buffet",
            estimated_amount=120000.0,
            actual_amount=115000.0,
            status=BudgetItemStatus.COMMITTED,
        ),
    )
    await service.add_item(
        eid,
        sample_user["id"],
        BudgetItemCreate(
            category=BudgetCategory.PHOTOGRAPHY,
            item_name="Photo & Video",
            estimated_amount=40000.0,
            actual_amount=42000.0,
            status=BudgetItemStatus.PAID,
        ),
    )

    summary = await service.get_summary(eid, sample_user["id"])

    assert summary.total_budget == 200000.0
    assert summary.total_estimated == 160000.0
    assert summary.total_actual == 157000.0
    assert summary.remaining_budget == 43000.0
    # Cost per guest = 157000 / 100 = 1570.0
    assert summary.cost_per_guest == 1570.0
    # Utilization = (157000 / 200000) * 100 = 78.5%
    assert summary.utilization_percentage == 78.5
    assert summary.is_overspent is False
    assert summary.overspent_amount == 0.0


@pytest.mark.asyncio
async def test_zero_budget_and_zero_guests_safety(test_db, sample_user):
    """Verify zero budget and zero guests do not cause ZeroDivisionError."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "Zero Event",
            "event_type": EventType.COMMUNITY.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Park",
            "expected_guest_count": 0,
            "total_budget": 0.0,
            "currency": "INR",
            "status": "planning",
        }
    )
    eid = event["id"]
    service = BudgetService(test_db)

    summary = await service.get_summary(eid, sample_user["id"])

    assert summary.total_budget == 0.0
    assert summary.cost_per_guest == 0.0
    assert summary.utilization_percentage == 0.0
    assert summary.is_overspent is False


@pytest.mark.asyncio
async def test_overspending_detection(test_db, sample_user):
    """Verify overspending is accurately flagged and calculated."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "Overspent Birthday",
            "event_type": EventType.BIRTHDAY.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Cafe",
            "expected_guest_count": 20,
            "total_budget": 10000.0,
            "currency": "INR",
            "status": "planning",
        }
    )
    eid = event["id"]
    service = BudgetService(test_db)

    await service.add_item(
        eid,
        sample_user["id"],
        BudgetItemCreate(
            category=BudgetCategory.DECORATION,
            item_name="Theme Setup",
            estimated_amount=8000.0,
            actual_amount=15000.0,
            status=BudgetItemStatus.PAID,
        ),
    )

    summary = await service.get_summary(eid, sample_user["id"])

    assert summary.is_overspent is True
    assert summary.overspent_amount == 5000.0
    assert summary.remaining_budget == -5000.0
    assert summary.utilization_percentage == 150.0


@pytest.mark.asyncio
async def test_negative_budget_amount_rejected(test_db, sample_user):
    """Verify negative budget amounts raise ValidationError."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "Negative Test Event",
            "event_type": EventType.BIRTHDAY.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Home",
            "expected_guest_count": 10,
            "total_budget": 5000.0,
            "currency": "INR",
            "status": "planning",
        }
    )
    eid = event["id"]
    service = BudgetService(test_db)

    from pydantic import ValidationError as PydanticValidationError

    with pytest.raises((ValidationError, PydanticValidationError)):
        await service.add_item(
            eid,
            sample_user["id"],
            BudgetItemCreate(
                category=BudgetCategory.CATERING,
                item_name="Invalid Item",
                estimated_amount=-500.0,
                actual_amount=0.0,
            ),
        )
