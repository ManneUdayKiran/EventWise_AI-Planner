"""API routes for conversational AI assistant and proposal confirmations."""

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_database
from app.schemas.assistant import (
    AssistantConfirmRequest,
    AssistantConfirmResponse,
    AssistantMessageLog,
    AssistantMessageRequest,
    AssistantResponse,
)
from app.schemas.user import UserResponse
from app.services.assistant_service import AssistantService

router = APIRouter(prefix="/events/{event_id}/assistant", tags=["Conversational Assistant"])


@router.post(
    "",
    response_model=AssistantResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a natural language instruction or question to the event assistant",
)
async def send_assistant_message(
    event_id: str,
    req: AssistantMessageRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AssistantResponse:
    """Submit a conversational modification request or query for targeted event planning changes."""
    service = AssistantService(db)
    return await service.handle_message(event_id, current_user.id, req)


@router.post(
    "/{proposal_id}/confirm",
    response_model=AssistantConfirmResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm or dismiss a staged proposal created by the assistant",
)
async def confirm_assistant_proposal(
    event_id: str,
    proposal_id: str,
    req: AssistantConfirmRequest = AssistantConfirmRequest(),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AssistantConfirmResponse:
    """Apply the staged diff changes to budget, tasks, vendors, and event meta or dismiss the proposal."""
    service = AssistantService(db)
    return await service.confirm_proposal(event_id, proposal_id, current_user.id, req.confirmed)


@router.get(
    "/history",
    response_model=list[AssistantMessageLog],
    status_code=status.HTTP_200_OK,
    summary="Retrieve conversation logs for this event",
)
async def get_assistant_history(
    event_id: str,
    limit: int = 50,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[AssistantMessageLog]:
    """Fetch chronological conversation message history and proposal references."""
    service = AssistantService(db)
    return await service.get_conversation_history(event_id, current_user.id, limit)
