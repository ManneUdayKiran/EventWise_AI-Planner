"""Vendor checklist and quotation tracking Pydantic schemas."""

from datetime import datetime
from enum import Enum

from pydantic import Field

from app.schemas.common import BaseSchema


class VendorCategory(str, Enum):
    """Eight primary event vendor categories."""

    VENUE = "venue"
    CATERING = "catering"
    PHOTOGRAPHY = "photography"
    DECORATION = "decoration"
    ENTERTAINMENT = "entertainment"
    INVITATIONS = "invitations"
    TRANSPORTATION = "transportation"
    EQUIPMENT_RENTAL = "equipment_rental"


class BookingStatus(str, Enum):
    """Vendor contract and booking state."""

    NOT_STARTED = "not_started"
    CONTACTED = "contacted"
    QUOTED = "quoted"
    BOOKED = "booked"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    """Vendor payment tracking state."""

    UNPAID = "unpaid"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"


class VendorItemBase(BaseSchema):
    """Base vendor checklist item attributes."""

    category: VendorCategory
    item_name: str = Field(..., min_length=2, max_length=150, description="Vendor or service name")
    quotation_amount: float = Field(
        default=0.0, ge=0.0, description="Quoted amount in event currency"
    )
    booking_status: BookingStatus = BookingStatus.NOT_STARTED
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    notes: str | None = Field(default=None, max_length=500)
    contact_info: str | None = Field(default=None, max_length=200)


class VendorItemCreate(VendorItemBase):
    """Payload to add a vendor checklist item."""

    pass


class VendorItemUpdate(BaseSchema):
    """Payload to update an existing vendor checklist item."""

    category: VendorCategory | None = None
    item_name: str | None = Field(default=None, min_length=2, max_length=150)
    quotation_amount: float | None = Field(default=None, ge=0.0)
    booking_status: BookingStatus | None = None
    payment_status: PaymentStatus | None = None
    notes: str | None = Field(default=None, max_length=500)
    contact_info: str | None = Field(default=None, max_length=200)


class VendorItemResponse(VendorItemBase):
    """Public vendor checklist item representation."""

    id: str
    event_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class VendorListResponse(BaseSchema):
    """Vendor items grouped with summary metrics."""

    items: list[VendorItemResponse]
    total_vendors: int
    booked_count: int
    total_quoted_amount: float
    items_by_category: dict[str, list[VendorItemResponse]]
