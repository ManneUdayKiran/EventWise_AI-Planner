"""Unit tests verifying AI provider failure handling and deterministic fallbacks."""

from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.ai import AIPlanGenerateRequest
from app.services.ai_service import AIService


@pytest.mark.asyncio
async def test_ai_provider_failure_triggers_fallback(test_db, sample_user):
    """When the primary AI provider raises an exception, the service must gracefully fall back to SampleAIProvider."""
    service = AIService(test_db)

    # Mock get_ai_provider to return a failing provider
    failing_provider = AsyncMock()
    failing_provider.provider_name = "failing_mock"
    failing_provider.generate_plan.side_effect = ConnectionError("Upstream AI API rate limit / timeout")

    with patch("app.services.ai_service.get_ai_provider", return_value=failing_provider):
        plan = await service.generate_plan(
            event_id="test-fallback-event",
            user_id=sample_user["id"],
            req=AIPlanGenerateRequest(
                event_context={
                    "name": "Summer Tech Summit",
                    "event_type": "conference",
                    "total_budget": 50000.0,
                    "expected_guest_count": 250,
                    "location": "Convention Center",
                }
            ),
        )

    # Verify fallback was activated
    assert plan is not None
    assert plan.is_fallback is True
    assert plan.event_id == "test-fallback-event"
    assert len(plan.budget_allocations) > 0
    assert len(plan.planning_tasks) > 0
    assert plan.total_proposed_budget > 0
