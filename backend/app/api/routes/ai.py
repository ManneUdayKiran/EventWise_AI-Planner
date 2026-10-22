"""API routes for AI plan generation, proposals, and plan application."""

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_database
from app.schemas.ai import (
    AIApplyPlanRequest,
    AIApplyPlanResponse,
    AIPlanGenerateRequest,
    AIPlanResponse,
)
from app.schemas.user import UserResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/events/{event_id}", tags=["AI Planning"])


@router.post(
    "/generate-plan",
    response_model=AIPlanResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate comprehensive AI event plan proposal",
)
async def generate_plan(
    event_id: str,
    req: AIPlanGenerateRequest = AIPlanGenerateRequest(),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AIPlanResponse:
    """Generate structured event planning recommendations, budgets, timeline tasks, and vendor requirements."""
    service = AIService(db)
    return await service.generate_plan(event_id, current_user.id, req)


@router.post(
    "/apply-plan",
    response_model=AIApplyPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Commit and apply AI plan proposal to event entities",
)
async def apply_plan(
    event_id: str,
    req: AIApplyPlanRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AIApplyPlanResponse:
    """Persist generated plan proposal items directly into budget, timeline, and vendor checklists."""
    service = AIService(db)
    return await service.apply_plan(event_id, current_user.id, req)
