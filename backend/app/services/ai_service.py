"""AI service coordinating plan generation, deterministic budget validation, and plan application."""

from datetime import UTC, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.factory import get_ai_provider
from app.core.errors import NotFoundError
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

UTC = UTC


def _round2(val: float) -> float:
    return float(Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


class AIService:
    """Service managing AI event planning workflows."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.event_repo = EventRepository(db)
        self.budget_repo = BudgetRepository(db)
        self.task_repo = TaskRepository(db)
        self.vendor_repo = VendorRepository(db)

    async def generate_plan(
        self, event_id: str, user_id: str, req: AIPlanGenerateRequest
    ) -> AIPlanResponse:
        """Generate structured AI event plan, enforcing ownership and deterministic math."""
        event = await self.event_repo.find_by_id_and_user(event_id, user_id)
        if not event:
            raise NotFoundError(f"Event with ID '{event_id}' not found.")

        # Determine provider
        provider_name = "sample" if req.force_fallback else None
        provider = get_ai_provider(provider_name)

        # Call provider
        plan = await provider.generate_plan(event)

        # Deterministic sanity recalculation: ensure budget allocations don't drift
        for alloc in plan.budget_allocations:
            alloc.estimated_amount = _round2(alloc.estimated_amount)

        plan.total_proposed_budget = _round2(
            sum(item.estimated_amount for item in plan.budget_allocations)
        )

        return plan

    async def apply_plan(
        self, event_id: str, user_id: str, req: AIApplyPlanRequest
    ) -> AIApplyPlanResponse:
        """Commit an approved AI plan proposal to the database entities."""
        event = await self.event_repo.find_by_id_and_user(event_id, user_id)
        if not event:
            raise NotFoundError(f"Event with ID '{event_id}' not found.")

        # If replace_existing is selected, clear existing entities
        if req.replace_existing:
            await self.budget_repo.collection.delete_many(
                {"event_id": event_id, "user_id": user_id}
            )
            await self.task_repo.collection.delete_many({"event_id": event_id, "user_id": user_id})
            await self.vendor_repo.collection.delete_many(
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

        proposal = req.proposal

        # 1. Commit Budget Allocations
        budget_count = 0
        for b_item in proposal.budget_allocations:
            await self.budget_repo.insert(
                {
                    "event_id": event_id,
                    "user_id": user_id,
                    "category": b_item.category.value
                    if hasattr(b_item.category, "value")
                    else str(b_item.category),
                    "item_name": b_item.item_name,
                    "estimated_amount": _round2(b_item.estimated_amount),
                    "actual_amount": 0.0,
                    "notes": b_item.notes,
                    "status": "planned",
                    "created_at": now,
                    "updated_at": now,
                }
            )
            budget_count += 1

        # 2. Commit Planning Tasks (calculate due dates based on event_date)
        task_count = 0
        for t_item in proposal.planning_tasks:
            due_date = event_date - timedelta(days=t_item.days_before_event)
            await self.task_repo.insert(
                {
                    "event_id": event_id,
                    "user_id": user_id,
                    "title": t_item.title,
                    "description": t_item.description,
                    "category": t_item.category,
                    "due_date": due_date,
                    "priority": t_item.priority.value
                    if hasattr(t_item.priority, "value")
                    else str(t_item.priority),
                    "status": "pending",
                    "dependencies": [],
                    "created_at": now,
                    "updated_at": now,
                }
            )
            task_count += 1

        # 3. Commit Vendor Requirements
        vendor_count = 0
        for v_item in proposal.vendor_categories:
            await self.vendor_repo.insert(
                {
                    "event_id": event_id,
                    "user_id": user_id,
                    "category": v_item.category.value
                    if hasattr(v_item.category, "value")
                    else str(v_item.category),
                    "item_name": v_item.item_name,
                    "quotation_amount": _round2(v_item.estimated_budget),
                    "booking_status": "not_started",
                    "payment_status": "unpaid",
                    "notes": v_item.suggested_scope,
                    "contact_info": None,
                    "created_at": now,
                    "updated_at": now,
                }
            )
            vendor_count += 1

        # Update event status to planning
        await self.event_repo.update_by_id(event_id, {"status": "planning", "updated_at": now})

        return AIApplyPlanResponse(
            event_id=event_id,
            budget_items_created=budget_count,
            tasks_created=task_count,
            vendors_created=vendor_count,
            message=f"Plan applied: {budget_count} budget items, {task_count} tasks, {vendor_count} vendors created.",
        )
