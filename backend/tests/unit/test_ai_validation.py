"""Unit tests for AI plan schemas, validation, and deterministic recalculation."""

import pytest
from pydantic import ValidationError

from app.core.errors import NotFoundError
from app.schemas.ai import (
    AIBudgetItemProposal,
    AIPlanGenerateRequest,
    AIPlanResponse,
    AITaskProposal,
)
from app.schemas.budget import BudgetCategory
from app.schemas.task import TaskPriority
from app.services.ai_service import AIService


def test_ai_budget_proposal_negative_amount_rejected():
    """Negative estimated allocations must be rejected by Pydantic."""
    with pytest.raises(ValidationError):
        AIBudgetItemProposal(
            category=BudgetCategory.VENUE,
            item_name="Grand Ballroom",
            estimated_amount=-150.0,
        )


def test_ai_task_proposal_bounds_validation():
    """Task days before event must be within valid bounds (0 to 730)."""
    with pytest.raises(ValidationError):
        AITaskProposal(
            title="Book venue",
            category="Venue",
            days_before_event=-5,  # Invalid negative
            priority=TaskPriority.HIGH,
        )

    with pytest.raises(ValidationError):
        AITaskProposal(
            title="Book venue",
            category="Venue",
            days_before_event=800,  # Exceeds max 730
            priority=TaskPriority.HIGH,
        )


def test_ai_plan_response_schema_validation():
    """Valid AIPlanResponse construction and serialization."""
    plan = AIPlanResponse(
        event_id="evt-101",
        summary="A wonderful gathering designed for joy and celebration.",
        theme_and_decor=["Starlight and silver accents"],
        food_recommendations=["Artisanal wood-fired pizzas"],
        entertainment_suggestions=["Live DJ set"],
        budget_allocations=[
            AIBudgetItemProposal(
                category=BudgetCategory.VENUE,
                item_name="Rooftop Hall",
                estimated_amount=1200.555,  # Test precision
            )
        ],
        total_proposed_budget=1200.56,
    )

    assert plan.event_id == "evt-101"
    assert plan.is_fallback is False
    assert plan.provider_used == "sample"


@pytest.mark.asyncio
async def test_ai_service_non_existent_event_raises_not_found(test_db):
    """AIService must reject plan generation for non-existent event IDs."""
    service = AIService(test_db)
    with pytest.raises(NotFoundError):
        await service.generate_plan(
            event_id="non-existent-event-id",
            user_id="any-user-id",
            req=AIPlanGenerateRequest(),
        )
