"""Unit tests for task priorities, overdue calculation, dependencies, and rescheduling."""

from datetime import UTC, datetime, timedelta

import pytest

from app.core.errors import ValidationError
from app.repositories.event_repo import EventRepository
from app.schemas.event import EventType
from app.schemas.task import (
    RescheduleTimelineRequest,
    TaskCreate,
    TaskPriority,
    TaskStatus,
    TaskUpdate,
)
from app.services.task_service import TaskService


@pytest.mark.asyncio
async def test_overdue_task_detection(test_db, sample_user):
    """Verify tasks past their due date are marked overdue unless completed."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "Timeline Event",
            "event_type": EventType.WEDDING.value,
            "event_date": datetime.now(UTC) + timedelta(days=30),
            "location": "Resort",
            "expected_guest_count": 50,
            "total_budget": 100000.0,
            "currency": "INR",
            "status": "planning",
        }
    )
    eid = event["id"]
    service = TaskService(test_db)

    # 1. Past due, pending -> overdue
    past_date = datetime.now(UTC) - timedelta(days=2)
    t1 = await service.create_task(
        eid,
        sample_user["id"],
        TaskCreate(
            title="Book Florist",
            category="decoration",
            due_date=past_date,
            priority=TaskPriority.HIGH,
        ),
    )

    # 2. Future due, pending -> not overdue
    future_date = datetime.now(UTC) + timedelta(days=5)
    await service.create_task(
        eid,
        sample_user["id"],
        TaskCreate(
            title="Send Invites",
            category="invitations",
            due_date=future_date,
            priority=TaskPriority.MEDIUM,
        ),
    )

    tasks_list = await service.get_tasks(eid, sample_user["id"])
    assert tasks_list.total_tasks == 2
    assert tasks_list.overdue_tasks == 1
    assert tasks_list.completed_tasks == 0

    # Complete the overdue task
    await service.update_task(
        t1.id,
        eid,
        sample_user["id"],
        TaskUpdate(status=TaskStatus.COMPLETED),
    )

    updated_list = await service.get_tasks(eid, sample_user["id"])
    assert updated_list.overdue_tasks == 0
    assert updated_list.completed_tasks == 1


@pytest.mark.asyncio
async def test_task_dependency_enforcement(test_db, sample_user):
    """Verify task cannot be marked completed if its dependency is still pending."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "Dependency Event",
            "event_type": EventType.COMMUNITY.value,
            "event_date": datetime.now(UTC) + timedelta(days=20),
            "location": "Town Hall",
            "expected_guest_count": 100,
            "total_budget": 50000.0,
            "currency": "INR",
            "status": "planning",
        }
    )
    eid = event["id"]
    service = TaskService(test_db)

    # Pre-requisite task
    dep_task = await service.create_task(
        eid,
        sample_user["id"],
        TaskCreate(
            title="Secure Permit",
            due_date=datetime.now(UTC) + timedelta(days=2),
        ),
    )

    # Dependent task
    child_task = await service.create_task(
        eid,
        sample_user["id"],
        TaskCreate(
            title="Set Up Stage",
            due_date=datetime.now(UTC) + timedelta(days=5),
            dependencies=[dep_task.id],
        ),
    )

    # Attempt to complete child task while dep_task is pending -> raises ValidationError
    with pytest.raises(ValidationError):
        await service.update_task(
            child_task.id,
            eid,
            sample_user["id"],
            TaskUpdate(status=TaskStatus.COMPLETED),
        )

    # Complete pre-requisite task first
    await service.update_task(
        dep_task.id,
        eid,
        sample_user["id"],
        TaskUpdate(status=TaskStatus.COMPLETED),
    )

    # Now child task can be completed successfully
    completed_child = await service.update_task(
        child_task.id,
        eid,
        sample_user["id"],
        TaskUpdate(status=TaskStatus.COMPLETED),
    )
    assert completed_child.status == TaskStatus.COMPLETED


@pytest.mark.asyncio
async def test_reschedule_preserves_completed_tasks(test_db, sample_user):
    """Verify timeline rescheduling shifts pending tasks while preserving completed tasks."""
    now = datetime.now(UTC)
    old_event_date = now + timedelta(days=30)
    new_event_date = now + timedelta(days=60)  # +30 days shift

    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "Reschedule Event",
            "event_type": EventType.WEDDING.value,
            "event_date": old_event_date,
            "location": "Beach",
            "expected_guest_count": 80,
            "total_budget": 300000.0,
            "currency": "INR",
            "status": "planning",
        }
    )
    eid = event["id"]
    service = TaskService(test_db)

    # Completed task
    comp_due = now - timedelta(days=1)
    t_comp = await service.create_task(
        eid,
        sample_user["id"],
        TaskCreate(title="Early Completed Task", due_date=comp_due),
    )
    await service.update_task(
        t_comp.id, eid, sample_user["id"], TaskUpdate(status=TaskStatus.COMPLETED)
    )

    # Pending task
    pending_due = now + timedelta(days=10)
    t_pending = await service.create_task(
        eid,
        sample_user["id"],
        TaskCreate(title="Future Pending Task", due_date=pending_due),
    )

    # Reschedule timeline
    rescheduled = await service.reschedule_timeline(
        eid,
        sample_user["id"],
        RescheduleTimelineRequest(new_event_date=new_event_date, preserve_completed=True),
    )

    # Check that completed task kept its date
    updated_comp = next(t for t in rescheduled.tasks if t.id == t_comp.id)
    assert abs((updated_comp.due_date - comp_due).total_seconds()) < 5

    # Check that pending task shifted by approximately 30 days
    updated_pending = next(t for t in rescheduled.tasks if t.id == t_pending.id)
    expected_pending_due = pending_due + timedelta(days=30)
    assert abs((updated_pending.due_date - expected_pending_due).total_seconds()) < 5
