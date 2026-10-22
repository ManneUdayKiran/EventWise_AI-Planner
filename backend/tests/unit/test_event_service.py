"""Unit tests for Event service: types, bounds validation, and ownership."""

from datetime import UTC, datetime

import pytest

from app.core.errors import NotFoundError, ValidationError
from app.schemas.event import EventCreate, EventType, EventUpdate
from app.services.event_service import EventService


@pytest.mark.asyncio
async def test_event_types_creation_success(test_db, sample_user):
    """Verify Wedding, Birthday, and Community events can be created."""
    service = EventService(test_db)

    # 1. Wedding
    wedding = await service.create_event(
        sample_user["id"],
        EventCreate(
            name="Priya & Rahul Wedding",
            event_type=EventType.WEDDING,
            event_date=datetime(2026, 12, 10, 18, 0, tzinfo=UTC),
            location="Heritage Palace",
            expected_guest_count=250,
            total_budget=800000.0,
            currency="INR",
            theme="Royal Rajasthani",
        ),
    )
    assert wedding.id is not None
    assert wedding.event_type == EventType.WEDDING

    # 2. Birthday
    bday = await service.create_event(
        sample_user["id"],
        EventCreate(
            name="Leo 5th Birthday",
            event_type=EventType.BIRTHDAY,
            event_date=datetime(2026, 11, 15, 16, 0, tzinfo=UTC),
            location="Adventure Zone",
            expected_guest_count=35,
            total_budget=25000.0,
            currency="INR",
            theme="Space Explorers",
        ),
    )
    assert bday.event_type == EventType.BIRTHDAY

    # 3. Community event
    community = await service.create_event(
        sample_user["id"],
        EventCreate(
            name="Green Valley Eco Fair",
            event_type=EventType.COMMUNITY,
            event_date=datetime(2026, 11, 20, 9, 0, tzinfo=UTC),
            location="Community Center",
            expected_guest_count=500,
            total_budget=150000.0,
            currency="INR",
        ),
    )
    assert community.event_type == EventType.COMMUNITY

    events_list = await service.list_user_events(sample_user["id"])
    assert len(events_list) == 3


@pytest.mark.asyncio
async def test_negative_event_budget_rejected(test_db, sample_user):
    """Verify negative budget is rejected by validation."""
    service = EventService(test_db)
    from pydantic import ValidationError as PydanticValidationError

    with pytest.raises((ValidationError, PydanticValidationError)):
        await service.create_event(
            sample_user["id"],
            EventCreate(
                name="Invalid Budget Event",
                event_type=EventType.BIRTHDAY,
                event_date=datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
                location="Venue",
                expected_guest_count=10,
                total_budget=-5000.0,
            ),
        )


@pytest.mark.asyncio
async def test_cross_user_event_access_rejected(test_db, sample_user, other_user):
    """Verify user cannot read or update another user's event."""
    service = EventService(test_db)
    event = await service.create_event(
        sample_user["id"],
        EventCreate(
            name="User A Private Wedding",
            event_type=EventType.WEDDING,
            event_date=datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            location="Private Venue",
            expected_guest_count=50,
            total_budget=100000.0,
        ),
    )

    # User B attempts to access User A's event -> raises NotFoundError
    with pytest.raises(NotFoundError):
        await service.get_event_detail(event.id, other_user["id"])

    # User B attempts to update User A's event -> raises NotFoundError
    with pytest.raises(NotFoundError):
        await service.update_event(
            event.id,
            other_user["id"],
            EventUpdate(name="Hacked Title"),
        )
