"""Vendor checklist and quotation management API routes."""

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_database
from app.schemas.user import UserResponse
from app.schemas.vendor import (
    VendorItemCreate,
    VendorItemResponse,
    VendorItemUpdate,
    VendorListResponse,
)
from app.services.vendor_service import VendorService

router = APIRouter(prefix="/events/{event_id}/vendors", tags=["Vendors"])


@router.get(
    "",
    response_model=VendorListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all vendor checklist items for an event",
)
async def list_vendors(
    event_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> VendorListResponse:
    """Retrieve all vendor checklist items categorized with quotation comparisons."""
    service = VendorService(db)
    return await service.get_vendors(event_id, current_user.id)


@router.post(
    "",
    response_model=VendorItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a vendor checklist item",
)
async def add_vendor(
    event_id: str,
    req: VendorItemCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> VendorItemResponse:
    """Record a vendor requirement, booking status, and quotation."""
    service = VendorService(db)
    return await service.add_vendor(event_id, current_user.id, req)


@router.put(
    "/{item_id}",
    response_model=VendorItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Update vendor checklist item",
)
async def update_vendor(
    event_id: str,
    item_id: str,
    req: VendorItemUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> VendorItemResponse:
    """Update quotation, booking status (contacted, quoted, booked), or payment status."""
    service = VendorService(db)
    return await service.update_vendor(item_id, event_id, current_user.id, req)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete vendor checklist item",
)
async def delete_vendor(
    event_id: str,
    item_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Delete a vendor checklist item from the event."""
    service = VendorService(db)
    await service.delete_vendor(item_id, event_id, current_user.id)
    return {"message": "Vendor item deleted successfully."}
