"""Unit tests for timeline modifications, fractional budget precision, and vendor workflows."""

from datetime import UTC, datetime, timedelta

import pytest

from app.repositories.event_repo import EventRepository
from app.schemas.budget import BudgetCategory, BudgetItemCreate, BudgetItemStatus
from app.schemas.event import EventType
from app.schemas.task import TaskCreate, TaskPriority, TaskStatus, TaskUpdate
from app.schemas.vendor import (
    BookingStatus,
    VendorCategory,
    VendorItemCreate,
    VendorItemUpdate,
)
from app.services.budget_service import BudgetService
from app.services.task_service import TaskService
from app.services.vendor_service import VendorService


@pytest.mark.asyncio
async def test_fractional_cents_budget_calculations(test_db, sample_user):
    """Verify fractional cents are properly rounded using ROUND_HALF_UP without floating drift."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "Precision Math Gala",
            "event_type": EventType.CORPORATE.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Banquet Hall",
            "expected_guest_count": 50,
            "total_budget": 1000.00,
            "currency": "USD",
        }
    )
    eid = event["id"]
    service = BudgetService(test_db)

    # Add items with fractional values that standard floats could accumulate rounding errors on
    await service.add_item(
        eid,
        sample_user["id"],
        BudgetItemCreate(
            category=BudgetCategory.DECORATION,
            item_name="Centerpieces",
            estimated_amount=100.125,  # rounds to 100.13
            actual_amount=100.125,
            status=BudgetItemStatus.COMMITTED,
        ),
    )
    await service.add_item(
        eid,
        sample_user["id"],
        BudgetItemCreate(
            category=BudgetCategory.INVITATIONS,
            item_name="Badges",
            estimated_amount=200.255,  # rounds to 200.26
            actual_amount=200.255,
            status=BudgetItemStatus.PAID,
        ),
    )

    summary = await service.get_summary(eid, sample_user["id"])
    assert summary.total_estimated == 300.39
    assert summary.total_actual == 300.39
    assert summary.remaining_budget == 699.61
    assert summary.cost_per_guest == 6.01  # 300.39 / 50 = 6.0078 -> 6.01


@pytest.mark.asyncio
async def test_timeline_task_status_and_overdue_modifications(test_db, sample_user):
    """Verify timeline task state progression and overdue detection."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "Timeline Testing Event",
            "event_type": EventType.BIRTHDAY.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Park",
            "expected_guest_count": 25,
            "total_budget": 5000.0,
            "currency": "USD",
        }
    )
    eid = event["id"]
    service = TaskService(test_db)

    # 1. Past due task (should be overdue)
    yesterday = datetime.now(UTC) - timedelta(days=1)
    task1 = await service.create_task(
        eid,
        sample_user["id"],
        TaskCreate(
            title="Send Invitations",
            category="Guests",
            due_date=yesterday,
            priority=TaskPriority.HIGH,
        ),
    )
    assert task1.is_overdue is True

    # 2. Update task to COMPLETED (completed tasks must not be marked overdue)
    updated = await service.update_task(
        task1.id,
        eid,
        sample_user["id"],
        TaskUpdate(status=TaskStatus.COMPLETED),
    )
    assert updated.status == TaskStatus.COMPLETED
    assert updated.is_overdue is False


@pytest.mark.asyncio
async def test_vendor_management_lifecycle(test_db, sample_user):
    """Verify vendor addition, status update, contract amount tracking, and deletion."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "Vendor Workflow Event",
            "event_type": EventType.WEDDING.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Garden",
            "expected_guest_count": 100,
            "total_budget": 20000.0,
            "currency": "USD",
        }
    )
    eid = event["id"]
    service = VendorService(test_db)

    # Add vendor
    v = await service.add_vendor(
        eid,
        sample_user["id"],
        VendorItemCreate(
            category=VendorCategory.CATERING,
            item_name="Royal Feasts",
            contact_info="chef@royalfeasts.com | +1234567890",
            booking_status=BookingStatus.CONTACTED,
            quotation_amount=5000.0,
        ),
    )
    assert v.booking_status == BookingStatus.CONTACTED

    # Update to BOOKED with new quotation amount
    v_updated = await service.update_vendor(
        v.id,
        eid,
        sample_user["id"],
        VendorItemUpdate(
            booking_status=BookingStatus.BOOKED,
            quotation_amount=5200.0,
            notes="Signed contract with beverage package included",
        ),
    )
    assert v_updated.booking_status == BookingStatus.BOOKED
    assert v_updated.quotation_amount == 5200.0
    assert v_updated.notes == "Signed contract with beverage package included"

    # Delete vendor
    success = await service.delete_vendor(v.id, eid, sample_user["id"])
    assert success is True
