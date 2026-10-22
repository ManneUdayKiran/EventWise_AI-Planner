"""Event management API routes."""

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_database
from app.schemas.event import EventCreate, EventDetailResponse, EventResponse, EventUpdate
from app.schemas.user import UserResponse
from app.services.event_service import EventService

router = APIRouter(prefix="/events", tags=["Events"])


@router.post(
    "",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new event",
)
async def create_event(
    req: EventCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> EventResponse:
    """Create a new event (Wedding, Birthday, Community)."""
    service = EventService(db)
    return await service.create_event(current_user.id, req)


@router.get(
    "",
    response_model=list[EventDetailResponse],
    status_code=status.HTTP_200_OK,
    summary="List all events owned by current user",
)
async def list_events(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[EventDetailResponse]:
    """List all events with summary metrics for the authenticated user."""
    service = EventService(db)
    return await service.list_user_events(current_user.id)


@router.get(
    "/{event_id}",
    response_model=EventDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get event details by ID",
)
async def get_event(
    event_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> EventDetailResponse:
    """Retrieve event details, enforcing ownership."""
    service = EventService(db)
    return await service.get_event_detail(event_id, current_user.id)


@router.put(
    "/{event_id}",
    response_model=EventDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Update event details",
)
async def update_event(
    event_id: str,
    req: EventUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> EventDetailResponse:
    """Update event properties."""
    service = EventService(db)
    return await service.update_event(event_id, current_user.id, req)


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete event and cascade child entities",
)
async def delete_event(
    event_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Delete an event and its associated budget items, tasks, and vendors."""
    service = EventService(db)
    await service.delete_event(event_id, current_user.id)
    return {"message": "Event and associated records deleted successfully."}
