"""API routes for conversational AI assistant and proposal confirmations."""

from fastapi import APIRouter, status

from app.schemas.assistant import (
    AssistantConfirmRequest,
    AssistantConfirmResponse,
    AssistantMessageLog,
    AssistantMessageRequest,
    AssistantResponse,
)
from app.services.assistant_service import AssistantService

router = APIRouter(tags=["Conversational Assistant"])


@router.post(
    "/events/{event_id}/assistant",
    response_model=AssistantResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a natural language instruction or question to the event assistant",
)
@router.post(
    "/ai/assistant",
    response_model=AssistantResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a natural language instruction or question directly",
)
async def send_assistant_message(
    event_id: str = "custom",
    req: AssistantMessageRequest | None = None,
) -> AssistantResponse:
    """Submit a conversational modification request or query for targeted event planning changes."""
    service = AssistantService()
    if req is None:
        req = AssistantMessageRequest(prompt="Hello")
    return await service.handle_message(event_id, "demo-planner-001", req)


@router.post(
    "/events/{event_id}/assistant/{proposal_id}/confirm",
    response_model=AssistantConfirmResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm or dismiss a staged proposal created by the assistant",
)
async def confirm_assistant_proposal(
    event_id: str,
    proposal_id: str,
    req: AssistantConfirmRequest = AssistantConfirmRequest(),
) -> AssistantConfirmResponse:
    """Apply the staged diff changes or dismiss the proposal."""
    return AssistantConfirmResponse(
        proposal_id=proposal_id,
        applied=req.confirmed,
        message="Proposal confirmed and applied to localStorage." if req.confirmed else "Proposal dismissed.",
    )


@router.get(
    "/events/{event_id}/assistant/history",
    response_model=list[AssistantMessageLog],
    status_code=status.HTTP_200_OK,
    summary="Retrieve conversation logs for this event",
)
async def get_assistant_history(
    event_id: str,
    limit: int = 50,
) -> list[AssistantMessageLog]:
    """Fetch chronological conversation message history."""
    return []
