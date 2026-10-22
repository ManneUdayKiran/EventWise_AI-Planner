"""API routes for AI plan generation, proposals, and plan application."""

from fastapi import APIRouter, status

from app.schemas.ai import (
    AIApplyPlanRequest,
    AIApplyPlanResponse,
    AIPlanGenerateRequest,
    AIPlanResponse,
)
from app.services.ai_service import AIService

router = APIRouter(tags=["AI Planning"])


@router.post(
    "/events/{event_id}/generate-plan",
    response_model=AIPlanResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate comprehensive AI event plan proposal",
)
@router.post(
    "/ai/generate-plan",
    response_model=AIPlanResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate comprehensive AI event plan proposal directly",
)
async def generate_plan(
    event_id: str = "custom",
    req: AIPlanGenerateRequest = AIPlanGenerateRequest(),
) -> AIPlanResponse:
    """Generate structured event planning recommendations, budgets, timeline tasks, and vendor requirements."""
    service = AIService()
    return await service.generate_plan(event_id, "demo-planner-001", req)


@router.post(
    "/events/{event_id}/apply-plan",
    response_model=AIApplyPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Commit and apply AI plan proposal to event entities",
)
async def apply_plan(
    event_id: str,
    req: AIApplyPlanRequest,
) -> AIApplyPlanResponse:
    """Persist generated plan proposal items directly."""
    service = AIService()
    return await service.apply_plan(event_id, "demo-planner-001", req)
