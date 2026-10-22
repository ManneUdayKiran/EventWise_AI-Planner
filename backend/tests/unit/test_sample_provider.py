"""Unit tests for the deterministic offline Sample AI provider."""

import pytest

from app.ai.providers.sample_provider import SampleAIProvider
from app.schemas.ai import AIPlanResponse
from app.schemas.budget import BudgetCategory


@pytest.mark.asyncio
async def test_sample_provider_wedding_plan():
    """Verify wedding plan generation with realistic budget allocations and tasks."""
    provider = SampleAIProvider()
    event_context = {
        "id": "test-wedding-1",
        "name": "Sophia & James Wedding",
        "event_type": "wedding",
        "event_date": "2026-12-15T18:00:00Z",
        "location": "Napa Valley Vineyards",
        "expected_guest_count": 120,
        "total_budget": 30000.0,
        "theme": "Wine Country Rustic",
    }

    plan: AIPlanResponse = await provider.generate_plan(event_context)

    assert plan.event_id == "test-wedding-1"
    assert plan.is_fallback is True
    assert plan.provider_used == "sample"
    assert "Sophia & James Wedding" in plan.summary
    assert len(plan.theme_and_decor) >= 3
    assert len(plan.food_recommendations) >= 3
    assert len(plan.entertainment_suggestions) >= 3
    assert len(plan.budget_allocations) >= 5
    assert len(plan.planning_tasks) >= 5
    assert len(plan.vendor_categories) >= 4
    assert len(plan.personalized_recommendations) >= 2

    # Verify deterministic budget arithmetic
    sum_allocations = round(sum(item.estimated_amount for item in plan.budget_allocations), 2)
    assert plan.total_proposed_budget == sum_allocations
    assert plan.total_proposed_budget <= 30000.01

    # Check key categories are included
    categories = {item.category for item in plan.budget_allocations}
    assert BudgetCategory.VENUE in categories
    assert BudgetCategory.CATERING in categories
    assert BudgetCategory.PHOTOGRAPHY in categories


@pytest.mark.asyncio
async def test_sample_provider_birthday_plan():
    """Verify birthday plan generation tailored for milestone celebrations."""
    provider = SampleAIProvider()
    event_context = {
        "id": "test-bday-1",
        "name": "Liam's 30th Birthday",
        "event_type": "birthday",
        "event_date": "2026-11-20T20:00:00Z",
        "location": "Skyline Lounge",
        "expected_guest_count": 50,
        "total_budget": 5000.0,
        "theme": "Neon Retro",
    }

    plan: AIPlanResponse = await provider.generate_plan(event_context)

    assert plan.event_id == "test-bday-1"
    assert "Liam's 30th Birthday" in plan.summary
    assert any("DJ" in item.item_name or "Photo" in item.item_name for item in plan.budget_allocations)
    assert plan.total_proposed_budget <= 5000.01


@pytest.mark.asyncio
async def test_sample_provider_community_plan():
    """Verify community event generation with permits and volunteer milestones."""
    provider = SampleAIProvider()
    event_context = {
        "id": "test-comm-1",
        "name": "Oakridge Fall Festival",
        "event_type": "community",
        "event_date": "2026-10-30T10:00:00Z",
        "location": "Oakridge Central Park",
        "expected_guest_count": 300,
        "total_budget": 8000.0,
        "theme": "Harvest Harvest",
    }

    plan: AIPlanResponse = await provider.generate_plan(event_context)

    assert plan.event_id == "test-comm-1"
    assert "Oakridge Fall Festival" in plan.summary
    assert any(task.category == "Permits" for task in plan.planning_tasks)
    assert any(v.category == "equipment_rental" for v in plan.vendor_categories)
