"""Budget management API routes."""

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_database
from app.schemas.budget import (
    BudgetItemCreate,
    BudgetItemResponse,
    BudgetItemUpdate,
    BudgetSummaryResponse,
)
from app.schemas.user import UserResponse
from app.services.budget_service import BudgetService

router = APIRouter(prefix="/events/{event_id}/budget", tags=["Budget"])


@router.get(
    "",
    response_model=BudgetSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get event budget summary and itemized expenses",
)
async def get_budget_summary(
    event_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> BudgetSummaryResponse:
    """Retrieve deterministic budget metrics, remaining balance, utilization, and category breakdowns."""
    service = BudgetService(db)
    return await service.get_summary(event_id, current_user.id)


@router.post(
    "",
    response_model=BudgetItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new budget item",
)
async def add_budget_item(
    event_id: str,
    req: BudgetItemCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> BudgetItemResponse:
    """Add a planned or actual expense item to the event budget."""
    service = BudgetService(db)
    return await service.add_item(event_id, current_user.id, req)


@router.put(
    "/{item_id}",
    response_model=BudgetItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Update an existing budget item",
)
async def update_budget_item(
    event_id: str,
    item_id: str,
    req: BudgetItemUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> BudgetItemResponse:
    """Update estimated or actual expenses for an existing budget item."""
    service = BudgetService(db)
    return await service.update_item(item_id, event_id, current_user.id, req)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a budget item",
)
async def delete_budget_item(
    event_id: str,
    item_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Remove a budget item from the event."""
    service = BudgetService(db)
    await service.delete_item(item_id, event_id, current_user.id)
    return {"message": "Budget item deleted successfully."}
