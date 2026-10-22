"""Unit tests for vendor categories, quotations, and status transitions."""

from datetime import UTC, datetime

import pytest

from app.core.errors import ValidationError
from app.repositories.event_repo import EventRepository
from app.schemas.event import EventType
from app.schemas.vendor import (
    BookingStatus,
    PaymentStatus,
    VendorCategory,
    VendorItemCreate,
    VendorItemUpdate,
)
from app.services.vendor_service import VendorService


@pytest.mark.asyncio
async def test_vendor_category_and_quotation_calculations(test_db, sample_user):
    """Verify vendor categories, quote calculations, and booking status counters."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "Vendor Test Event",
            "event_type": EventType.WEDDING.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Banquet Hall",
            "expected_guest_count": 150,
            "total_budget": 500000.0,
            "currency": "INR",
            "status": "planning",
        }
    )
    eid = event["id"]
    service = VendorService(test_db)

    # 1. Photography vendor (Booked)
    await service.add_vendor(
        eid,
        sample_user["id"],
        VendorItemCreate(
            category=VendorCategory.PHOTOGRAPHY,
            item_name="Ace Studio",
            quotation_amount=75000.0,
            booking_status=BookingStatus.BOOKED,
            payment_status=PaymentStatus.PARTIALLY_PAID,
            contact_info="contact@acestudio.com",
        ),
    )

    # 2. Catering vendor (Quoted)
    v2 = await service.add_vendor(
        eid,
        sample_user["id"],
        VendorItemCreate(
            category=VendorCategory.CATERING,
            item_name="Royal Caterers",
            quotation_amount=180000.0,
            booking_status=BookingStatus.QUOTED,
            payment_status=PaymentStatus.UNPAID,
        ),
    )

    vendors_data = await service.get_vendors(eid, sample_user["id"])
    assert vendors_data.total_vendors == 2
    assert vendors_data.booked_count == 1
    assert vendors_data.total_quoted_amount == 255000.0
    assert "photography" in vendors_data.items_by_category
    assert "catering" in vendors_data.items_by_category

    # Update catering vendor to BOOKED
    updated_v2 = await service.update_vendor(
        v2.id,
        eid,
        sample_user["id"],
        VendorItemUpdate(booking_status=BookingStatus.BOOKED),
    )
    assert updated_v2.booking_status == BookingStatus.BOOKED

    updated_summary = await service.get_vendors(eid, sample_user["id"])
    assert updated_summary.booked_count == 2


@pytest.mark.asyncio
async def test_negative_quotation_rejected(test_db, sample_user):
    """Verify negative quotation amounts are rejected with ValidationError."""
    event_repo = EventRepository(test_db)
    event = await event_repo.insert(
        {
            "user_id": sample_user["id"],
            "name": "Invalid Quote Event",
            "event_type": EventType.BIRTHDAY.value,
            "event_date": datetime(2026, 12, 1, 10, 0, tzinfo=UTC),
            "location": "Lawn",
            "expected_guest_count": 30,
            "total_budget": 20000.0,
            "currency": "INR",
            "status": "planning",
        }
    )
    eid = event["id"]
    service = VendorService(test_db)

    from pydantic import ValidationError as PydanticValidationError

    with pytest.raises((ValidationError, PydanticValidationError)):
        await service.add_vendor(
            eid,
            sample_user["id"],
            VendorItemCreate(
                category=VendorCategory.DECORATION,
                item_name="Decor Rental",
                quotation_amount=-1500.0,
            ),
        )
