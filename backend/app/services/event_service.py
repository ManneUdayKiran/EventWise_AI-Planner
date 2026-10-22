"""Event management business service with aggregation metrics."""

from datetime import UTC, datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.errors import NotFoundError, ValidationError
from app.core.utils import round_currency
from app.repositories.budget_repo import BudgetRepository
from app.repositories.event_repo import EventRepository
from app.repositories.task_repo import TaskRepository
from app.repositories.vendor_repo import VendorRepository
from app.schemas.event import (
    EventCreate,
    EventDetailResponse,
    EventResponse,
    EventStatus,
    EventSummaryStats,
    EventUpdate,
)


class EventService:
    """Service handling Event CRUD, multi-tenant ownership, and summary statistics."""

    def __init__(self, db: AsyncIOMotorDatabase | None = None):
        self.db = db
        self.event_repo = EventRepository(db)
        self.budget_repo = BudgetRepository(db)
        self.task_repo = TaskRepository(db)
        self.vendor_repo = VendorRepository(db)

    async def create_event(self, user_id: str, req: EventCreate) -> EventResponse:
        """Create a new event."""
        if req.total_budget < 0.0:
            raise ValidationError("Total budget cannot be negative.")
        if req.expected_guest_count < 0:
            raise ValidationError("Guest count cannot be negative.")

        event_date = req.event_date
        if event_date.tzinfo is None:
            event_date = event_date.replace(tzinfo=UTC)

        data: dict[str, Any] = {
            "user_id": user_id,
            "name": req.name.strip(),
            "event_type": str(getattr(req.event_type, "value", req.event_type)).strip(),
            "event_date": event_date,
            "location": req.location.strip(),
            "expected_guest_count": req.expected_guest_count,
            "total_budget": round_currency(req.total_budget),
            "currency": req.currency.upper().strip(),
            "theme": req.theme.strip() if req.theme else None,
            "preferences": req.preferences.strip() if req.preferences else None,
            "special_requirements": req.special_requirements.strip()
            if req.special_requirements
            else None,
            "status": str(getattr(EventStatus.PLANNING, "value", "planning")),
        }

        doc = await self.event_repo.insert(data)
        return EventResponse(**doc)

    async def list_user_events(self, user_id: str) -> list[EventDetailResponse]:
        """List all events belonging to the user with calculated planning progress stats."""
        raw_events = await self.event_repo.find_all_by_user(user_id)
        results: list[EventDetailResponse] = []

        now = datetime.now(UTC)
        for e in raw_events:
            eid = e["id"]
            # Fetch summary numbers
            budget_items = await self.budget_repo.find_all_by_event(eid, user_id)
            tasks = await self.task_repo.find_all_by_event(eid, user_id)
            vendors = await self.vendor_repo.find_all_by_event(eid, user_id)

            allocated = sum(b.get("estimated_amount", 0.0) for b in budget_items)
            spent = sum(b.get("actual_amount", 0.0) for b in budget_items)
            rem = round_currency(float(e.get("total_budget", 0.0)) - (spent if spent > 0 else allocated))

            total_t = len(tasks)
            completed_t = sum(1 for t in tasks if t.get("status") == "completed")
            overdue_t = sum(
                1
                for t in tasks
                if (
                    t["due_date"].replace(tzinfo=UTC)
                    if t["due_date"].tzinfo is None
                    else t["due_date"]
                )
                < now
                and t.get("status") != "completed"
            )
            pct = round((completed_t / total_t * 100), 1) if total_t > 0 else 0.0

            stats = EventSummaryStats(
                budget_allocated=round_currency(allocated),
                budget_spent=round_currency(spent),
                budget_remaining=rem,
                total_tasks=total_t,
                completed_tasks=completed_t,
                overdue_tasks=overdue_t,
                task_progress_percentage=pct,
                total_vendors=len(vendors),
                booked_vendors=sum(1 for v in vendors if v.get("booking_status") == "booked"),
            )

            results.append(EventDetailResponse(**e, stats=stats))

        return results

    async def get_event_detail(self, event_id: str, user_id: str) -> EventDetailResponse:
        """Get event details enforcing user ownership with complete metrics."""
        e = await self.event_repo.find_by_id_and_user(event_id, user_id)
        if not e:
            raise NotFoundError("Event not found or unauthorized.")

        now = datetime.now(UTC)
        budget_items = await self.budget_repo.find_all_by_event(event_id, user_id)
        tasks = await self.task_repo.find_all_by_event(event_id, user_id)
        vendors = await self.vendor_repo.find_all_by_event(event_id, user_id)

        allocated = sum(b.get("estimated_amount", 0.0) for b in budget_items)
        spent = sum(b.get("actual_amount", 0.0) for b in budget_items)
        rem = round_currency(float(e.get("total_budget", 0.0)) - (spent if spent > 0 else allocated))

        total_t = len(tasks)
        completed_t = sum(1 for t in tasks if t.get("status") == "completed")
        overdue_t = sum(
            1
            for t in tasks
            if (
                t["due_date"].replace(tzinfo=UTC) if t["due_date"].tzinfo is None else t["due_date"]
            )
            < now
            and t.get("status") != "completed"
        )
        pct = round((completed_t / total_t * 100), 1) if total_t > 0 else 0.0

        stats = EventSummaryStats(
            budget_allocated=round_currency(allocated),
            budget_spent=round_currency(spent),
            budget_remaining=rem,
            total_tasks=total_t,
            completed_tasks=completed_t,
            overdue_tasks=overdue_t,
            task_progress_percentage=pct,
            total_vendors=len(vendors),
            booked_vendors=sum(1 for v in vendors if v.get("booking_status") == "booked"),
        )

        return EventDetailResponse(**e, stats=stats)

    async def update_event(
        self, event_id: str, user_id: str, req: EventUpdate
    ) -> EventDetailResponse:
        """Update event details enforcing ownership."""
        existing = await self.event_repo.find_by_id_and_user(event_id, user_id)
        if not existing:
            raise NotFoundError("Event not found or unauthorized.")

        updates: dict[str, Any] = {}
        if req.name is not None:
            updates["name"] = req.name.strip()
        if req.event_type is not None:
            updates["event_type"] = str(getattr(req.event_type, "value", req.event_type)).strip()
        if req.event_date is not None:
            due = req.event_date
            if due.tzinfo is None:
                due = due.replace(tzinfo=UTC)
            updates["event_date"] = due
        if req.location is not None:
            updates["location"] = req.location.strip()
        if req.expected_guest_count is not None:
            if req.expected_guest_count < 0:
                raise ValidationError("Guest count cannot be negative.")
            updates["expected_guest_count"] = req.expected_guest_count
        if req.total_budget is not None:
            if req.total_budget < 0.0:
                raise ValidationError("Total budget cannot be negative.")
            updates["total_budget"] = round_currency(req.total_budget)
        if req.currency is not None:
            updates["currency"] = req.currency.upper().strip()
        if req.theme is not None:
            updates["theme"] = req.theme.strip() if req.theme else None
        if req.preferences is not None:
            updates["preferences"] = req.preferences.strip() if req.preferences else None
        if req.special_requirements is not None:
            updates["special_requirements"] = (
                req.special_requirements.strip() if req.special_requirements else None
            )
        if req.status is not None:
            updates["status"] = str(getattr(req.status, "value", req.status))

        updated = await self.event_repo.update_by_id_and_user(event_id, user_id, updates)
        if not updated:
            raise NotFoundError("Event not found.")

        return await self.get_event_detail(event_id, user_id)

    async def delete_event(self, event_id: str, user_id: str) -> bool:
        """Delete an event and all associated items."""
        deleted = await self.event_repo.delete_cascade(event_id, user_id)
        if not deleted:
            raise NotFoundError("Event not found or unauthorized.")
        return True
