import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.factory import get_ai_provider
from app.ai.providers.sample_provider import SampleAIProvider
from app.core.errors import NotFoundError
from app.core.utils import round_currency
from app.repositories.budget_repo import BudgetRepository
from app.repositories.event_repo import EventRepository
from app.repositories.task_repo import TaskRepository
from app.repositories.vendor_repo import VendorRepository
from app.schemas.ai import (
    AIApplyPlanRequest,
    AIApplyPlanResponse,
    AIPlanGenerateRequest,
    AIPlanResponse,
)

logger = logging.getLogger(__name__)


class AIService:
    """Service managing AI event planning workflows."""

    db: AsyncIOMotorDatabase | None
    event_repo: EventRepository | None
    budget_repo: BudgetRepository | None
    task_repo: TaskRepository | None
    vendor_repo: VendorRepository | None

    def __init__(self, db: AsyncIOMotorDatabase | None = None):
        self.db = db
        if db is not None:
            self.event_repo = EventRepository(db)
            self.budget_repo = BudgetRepository(db)
            self.task_repo = TaskRepository(db)
            self.vendor_repo = VendorRepository(db)
        else:
            self.event_repo = None
            self.budget_repo = None
            self.task_repo = None
            self.vendor_repo = None

    async def generate_plan(
        self, event_id: str, user_id: str, req: AIPlanGenerateRequest | None = None
    ) -> AIPlanResponse:
        """Generate structured AI event plan, using client localStorage context or repository."""
        if req is None:
            req = AIPlanGenerateRequest()
        elif isinstance(req, dict):
            req = AIPlanGenerateRequest(**req)

        event = req.event_context
        event_repo = self.event_repo
        if not event and event_repo is not None:
            try:
                event = await event_repo.find_by_id_and_user(event_id, user_id)
            except Exception:
                event = None
            if not event:
                raise NotFoundError(f"Event with ID '{event_id}' not found.")

        event_dict: dict[str, Any]
        if not event:
            event_dict = {
                "id": event_id,
                "name": "Event",
                "event_type": "wedding",
                "total_budget": 10000,
                "expected_guest_count": 50,
                "event_date": "2026-12-31T00:00:00Z",
                "location": "Main Venue",
            }
        elif isinstance(event, dict):
            event_dict = dict(event)
        elif hasattr(event, "model_dump"):
            event_dict = event.model_dump()  # type: ignore
        elif hasattr(event, "dict"):
            event_dict = event.dict()  # type: ignore
        else:
            try:
                event_dict = dict(event)  # type: ignore
            except Exception:
                event_dict = {"id": event_id}

        event_dict["id"] = event_id
        focus_areas = getattr(req, "focus_areas", None) or getattr(req, "focus_aeas", None)
        if focus_areas:
            event_dict["focus_areas"] = focus_areas

        # Determine provider
        provider_name = "sample" if req.force_fallback else None
        provider = get_ai_provider(provider_name)

        # Call provider with automatic fallback on failure
        try:
            plan = await provider.generate_plan(event_dict)
        except Exception as err:
            logger.warning(
                "Primary AI provider '%s' failed (%s). Activating deterministic fallback provider.",
                getattr(provider, "provider_name", "unknown"),
                err,
            )
            fallback_provider = SampleAIProvider()
            plan = await fallback_provider.generate_plan(event_dict)
            plan.is_fallback = True

        # Deterministic sanity recalculation: ensure budget allocations don't drift
        for alloc in plan.budget_allocations:
            alloc.estimated_amount = round_currency(alloc.estimated_amount)

        plan.total_proposed_budget = round_currency(
            sum(item.estimated_amount for item in plan.budget_allocations)
        )

        return plan

    async def apply_plan(
        self, event_id: str, user_id: str, req: AIApplyPlanRequest
    ) -> AIApplyPlanResponse:
        """Commit an approved AI plan proposal to database entities (if db configured) or return success."""
        proposal = req.proposal
        budget_count = len(proposal.budget_allocations)
        task_count = len(proposal.planning_tasks)
        vendor_count = len(proposal.vendor_categories)

        event_repo = self.event_repo
        budget_repo = self.budget_repo
        task_repo = self.task_repo
        vendor_repo = self.vendor_repo

        if (
            event_repo is not None
            and budget_repo is not None
            and task_repo is not None
            and vendor_repo is not None
        ):
            event = await event_repo.find_by_id_and_user(event_id, user_id)
            if not event:
                raise NotFoundError(f"Event with ID '{event_id}' not found.")

            if req.replace_existing:
                await budget_repo.collection.delete_many(
                    {"event_id": event_id, "user_id": user_id}
                )
                await task_repo.collection.delete_many({"event_id": event_id, "user_id": user_id})
                await vendor_repo.collection.delete_many(
                    {"event_id": event_id, "user_id": user_id}
                )

            now = datetime.now(UTC)
            raw_date = event.get("event_date")
            if isinstance(raw_date, str):
                event_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
            elif isinstance(raw_date, datetime):
                event_date = raw_date
            else:
                event_date = now

            # 1. Commit Budget Allocations
            for b_item in proposal.budget_allocations:
                await budget_repo.insert(
                    {
                        "event_id": event_id,
                        "user_id": user_id,
                        "category": b_item.category.value
                        if hasattr(b_item.category, "value")
                        else str(b_item.category),
                        "item_name": b_item.item_name,
                        "estimated_amount": round_currency(b_item.estimated_amount),
                        "actual_amount": 0.0,
                        "notes": b_item.notes,
                        "status": "planned",
                        "created_at": now,
                        "updated_at": now,
                    }
                )

            # 2. Commit Planning Tasks (calculate due dates based on event_date)
            for t_item in proposal.planning_tasks:
                due_date = event_date - timedelta(days=t_item.days_before_event)
                await task_repo.insert(
                    {
                        "event_id": event_id,
                        "user_id": user_id,
                        "title": t_item.title,
                        "category": t_item.category,
                        "due_date": due_date,
                        "priority": t_item.priority.value
                        if hasattr(t_item.priority, "value")
                        else str(t_item.priority),
                        "status": "pending",
                        "dependencies": [],
                        "description": t_item.description,
                        "created_at": now,
                        "updated_at": now,
                    }
                )

            # 3. Commit Vendor Requirements
            for v_item in proposal.vendor_categories:
                await vendor_repo.insert(
                    {
                        "event_id": event_id,
                        "user_id": user_id,
                        "category": v_item.category.value
                        if hasattr(v_item.category, "value")
                        else str(v_item.category),
                        "item_name": v_item.item_name,
                        "quotation_amount": round_currency(v_item.estimated_budget),
                        "booking_status": "not_started",
                        "payment_status": "unpaid",
                        "notes": v_item.suggested_scope,
                        "contact_info": None,
                        "created_at": now,
                        "updated_at": now,
                    }
                )

        return AIApplyPlanResponse(
            event_id=event_id,
            budget_items_created=budget_count,
            tasks_created=task_count,
            vendors_created=vendor_count,
            message="Plan successfully applied to event.",
        )
