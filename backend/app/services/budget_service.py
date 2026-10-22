"""Deterministic budget calculation and expense management service."""

from collections import defaultdict

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.errors import NotFoundError, ValidationError
from app.repositories.budget_repo import BudgetRepository
from app.repositories.event_repo import EventRepository
from app.schemas.budget import (
    BudgetItemCreate,
    BudgetItemResponse,
    BudgetItemUpdate,
    BudgetSummaryResponse,
    CategoryBreakdown,
)


class BudgetService:
    """Service performing deterministic mathematical calculations for event budgets."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.budget_repo = BudgetRepository(db)
        self.event_repo = EventRepository(db)

    async def get_summary(self, event_id: str, user_id: str) -> BudgetSummaryResponse:
        """Calculate complete budget metrics deterministically in application code."""
        event = await self.event_repo.find_by_id_and_user(event_id, user_id)
        if not event:
            raise NotFoundError("Event not found or access unauthorized.")

        items_raw = await self.budget_repo.find_all_by_event(event_id, user_id)

        total_budget = round(float(event.get("total_budget", 0.0)), 2)
        guest_count = int(event.get("expected_guest_count", 0))
        currency = str(event.get("currency", "INR"))

        total_estimated = 0.0
        total_actual = 0.0
        category_map: dict[str, dict[str, float]] = defaultdict(
            lambda: {"estimated": 0.0, "actual": 0.0, "count": 0}
        )

        items_resp: list[BudgetItemResponse] = []
        for raw in items_raw:
            est = round(float(raw.get("estimated_amount", 0.0)), 2)
            act = round(float(raw.get("actual_amount", 0.0)), 2)
            cat = str(raw.get("category", "miscellaneous"))

            total_estimated += est
            total_actual += act

            category_map[cat]["estimated"] += est
            category_map[cat]["actual"] += act
            category_map[cat]["count"] += 1

            items_resp.append(
                BudgetItemResponse(
                    id=raw["id"],
                    event_id=raw["event_id"],
                    user_id=raw["user_id"],
                    category=raw["category"],
                    item_name=raw["item_name"],
                    estimated_amount=est,
                    actual_amount=act,
                    notes=raw.get("notes"),
                    status=raw.get("status", "planned"),
                    created_at=raw["created_at"],
                    updated_at=raw.get("updated_at") or raw["created_at"],
                )
            )

        total_estimated = round(total_estimated, 2)
        total_actual = round(total_actual, 2)

        # Invariants: remaining budget
        if total_actual > 0:
            remaining_budget = round(total_budget - total_actual, 2)
            is_overspent = total_actual > total_budget
            overspent_amount = round(max(0.0, total_actual - total_budget), 2)
        else:
            remaining_budget = round(total_budget - total_estimated, 2)
            is_overspent = total_estimated > total_budget
            overspent_amount = round(max(0.0, total_estimated - total_budget), 2)

        # Zero guest count safety rule
        if guest_count > 0:
            eff_amount = total_actual if total_actual > 0 else total_estimated
            cost_per_guest = round(eff_amount / guest_count, 2)
        else:
            cost_per_guest = 0.0

        # Zero total budget safety rule
        if total_budget > 0.0:
            utilization_percentage = round((total_actual / total_budget) * 100, 2)
        else:
            utilization_percentage = 0.0

        breakdown = {
            cat: CategoryBreakdown(
                estimated=round(stats["estimated"], 2),
                actual=round(stats["actual"], 2),
                count=int(stats["count"]),
            )
            for cat, stats in category_map.items()
        }

        return BudgetSummaryResponse(
            total_budget=total_budget,
            currency=currency,
            total_estimated=total_estimated,
            total_actual=total_actual,
            remaining_budget=remaining_budget,
            cost_per_guest=cost_per_guest,
            utilization_percentage=utilization_percentage,
            is_overspent=is_overspent,
            overspent_amount=overspent_amount,
            items_by_category=breakdown,
            items=items_resp,
        )

    async def add_item(
        self, event_id: str, user_id: str, req: BudgetItemCreate
    ) -> BudgetItemResponse:
        """Add a validated budget item to the event."""
        event = await self.event_repo.find_by_id_and_user(event_id, user_id)
        if not event:
            raise NotFoundError("Event not found or access unauthorized.")

        if req.estimated_amount < 0.0 or req.actual_amount < 0.0:
            raise ValidationError("Budget item amounts cannot be negative.")

        data = {
            "event_id": event_id,
            "user_id": user_id,
            "category": req.category.value,
            "item_name": req.item_name.strip(),
            "estimated_amount": round(float(req.estimated_amount), 2),
            "actual_amount": round(float(req.actual_amount), 2),
            "notes": req.notes.strip() if req.notes else None,
            "status": req.status.value,
        }
        doc = await self.budget_repo.insert(data)
        return BudgetItemResponse(**doc)

    async def update_item(
        self, item_id: str, event_id: str, user_id: str, req: BudgetItemUpdate
    ) -> BudgetItemResponse:
        """Update an existing budget item."""
        existing = await self.budget_repo.find_by_id_and_event(item_id, event_id, user_id)
        if not existing:
            raise NotFoundError("Budget item not found or unauthorized.")

        updates = {}
        if req.category is not None:
            updates["category"] = req.category.value
        if req.item_name is not None:
            updates["item_name"] = req.item_name.strip()
        if req.estimated_amount is not None:
            if req.estimated_amount < 0.0:
                raise ValidationError("Estimated amount cannot be negative.")
            updates["estimated_amount"] = round(float(req.estimated_amount), 2)
        if req.actual_amount is not None:
            if req.actual_amount < 0.0:
                raise ValidationError("Actual amount cannot be negative.")
            updates["actual_amount"] = round(float(req.actual_amount), 2)
        if req.notes is not None:
            updates["notes"] = req.notes.strip() if req.notes else None
        if req.status is not None:
            updates["status"] = req.status.value

        updated_doc = await self.budget_repo.update_by_id_and_event(
            item_id, event_id, user_id, updates
        )
        if not updated_doc:
            raise NotFoundError("Budget item not found.")
        return BudgetItemResponse(**updated_doc)

    async def delete_item(self, item_id: str, event_id: str, user_id: str) -> bool:
        """Remove a budget item from the event."""
        deleted = await self.budget_repo.delete_by_id_and_event(item_id, event_id, user_id)
        if not deleted:
            raise NotFoundError("Budget item not found or unauthorized.")
        return True
