"""Unit tests enforcing strict multi-tenant data isolation across users."""

from datetime import UTC, datetime

import pytest

from app.core.errors import NotFoundError
from app.repositories.event_repo import EventRepository
from app.schemas.ai import AIPlanGenerateRequest
from app.schemas.budget import BudgetCategory, BudgetItemCreate, BudgetItemUpdate
from app.schemas.event import EventType
from app.schemas.task import TaskCreate, TaskPriority, TaskUpdate
from app.schemas.vendor import (
    BookingStatus,
    VendorCategory,
    VendorItemCreate,
    VendorItemUpdate,
)
from app.services.ai_service import AIService
from app.services.budget_service import BudgetService
from app.services.task_service import TaskService
from app.services.vendor_service import VendorService


@pytest.mark.asyncio
async def test_cross_user_budget_isolation(test_db, sample_user, other_user):
    """User B must not be able to read, create, update, or delete User A's budget items."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "User A Private Gala",
            "event_type": EventType.CORPORATE.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Convention Center",
            "expected_guest_count": 200,
            "total_budget": 50000.0,
            "currency": "USD",
        }
    )
    eid = event["id"]
    budget_service = BudgetService(test_db)

    # User A creates a budget item
    item = await budget_service.add_item(
        eid,
        sample_user["id"],
        BudgetItemCreate(
            category=BudgetCategory.VENUE,
            item_name="Main Stage",
            estimated_amount=15000.0,
            actual_amount=14000.0,
        ),
    )

    # User B cannot get summary of User A's event
    with pytest.raises(NotFoundError):
        await budget_service.get_summary(eid, other_user["id"])

    # User B cannot add item to User A's event
    with pytest.raises(NotFoundError):
        await budget_service.add_item(
            eid,
            other_user["id"],
            BudgetItemCreate(
                category=BudgetCategory.CATERING,
                item_name="Unauthorized Buffet",
                estimated_amount=5000.0,
            ),
        )

    # User B cannot update User A's item
    with pytest.raises(NotFoundError):
        await budget_service.update_item(
            item.id,
            eid,
            other_user["id"],
            BudgetItemUpdate(item_name="Hacked Name"),
        )

    # User B cannot delete User A's item
    with pytest.raises(NotFoundError):
        await budget_service.delete_item(item.id, eid, other_user["id"])


@pytest.mark.asyncio
async def test_cross_user_task_isolation(test_db, sample_user, other_user):
    """User B must not be able to read, create, update, or delete User A's tasks."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "User A Task Isolation Event",
            "event_type": EventType.WEDDING.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Resort",
            "expected_guest_count": 80,
            "total_budget": 30000.0,
            "currency": "USD",
        }
    )
    eid = event["id"]
    task_service = TaskService(test_db)

    # User A creates a task
    task = await task_service.create_task(
        eid,
        sample_user["id"],
        TaskCreate(
            title="Book Florist",
            category="Decor",
            due_date=datetime(2026, 11, 1, tzinfo=UTC),
            priority=TaskPriority.HIGH,
        ),
    )

    # User B cannot list User A's tasks
    with pytest.raises(NotFoundError):
        await task_service.get_tasks(eid, other_user["id"])

    # User B cannot update User A's task
    with pytest.raises(NotFoundError):
        await task_service.update_task(
            task.id,
            eid,
            other_user["id"],
            TaskUpdate(title="Malicious update"),
        )

    # User B cannot delete User A's task
    with pytest.raises(NotFoundError):
        await task_service.delete_task(task.id, eid, other_user["id"])


@pytest.mark.asyncio
async def test_cross_user_vendor_isolation(test_db, sample_user, other_user):
    """User B must not be able to view, create, or modify User A's vendors."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "User A Vendor Isolation Event",
            "event_type": EventType.BIRTHDAY.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Park",
            "expected_guest_count": 40,
            "total_budget": 10000.0,
            "currency": "USD",
        }
    )
    eid = event["id"]
    vendor_service = VendorService(test_db)

    # User A adds vendor
    vendor = await vendor_service.add_vendor(
        eid,
        sample_user["id"],
        VendorItemCreate(
            category=VendorCategory.CATERING,
            item_name="Gourmet Bakery",
            booking_status=BookingStatus.CONTACTED,
            quotation_amount=1500.0,
        ),
    )

    # User B cannot list User A's vendors
    with pytest.raises(NotFoundError):
        await vendor_service.get_vendors(eid, other_user["id"])

    # User B cannot update User A's vendor
    with pytest.raises(NotFoundError):
        await vendor_service.update_vendor(
            vendor.id,
            eid,
            other_user["id"],
            VendorItemUpdate(item_name="Fake Vendor"),
        )

    # User B cannot delete User A's vendor
    with pytest.raises(NotFoundError):
        await vendor_service.delete_vendor(vendor.id, eid, other_user["id"])


@pytest.mark.asyncio
async def test_cross_user_ai_plan_isolation(test_db, sample_user, other_user):
    """User B cannot generate or apply AI plans to User A's event."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "User A AI Isolation Event",
            "event_type": EventType.CORPORATE.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Auditorium",
            "expected_guest_count": 150,
            "total_budget": 45000.0,
            "currency": "USD",
        }
    )
    eid = event["id"]
    ai_service = AIService(test_db)

    with pytest.raises(NotFoundError):
        await ai_service.generate_plan(
            event_id=eid,
            user_id=other_user["id"],
            req=AIPlanGenerateRequest(),
        )
