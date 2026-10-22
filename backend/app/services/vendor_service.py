"""Vendor checklist and quotation tracking business service."""

from collections import defaultdict

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.errors import NotFoundError, ValidationError
from app.repositories.event_repo import EventRepository
from app.repositories.vendor_repo import VendorRepository
from app.schemas.vendor import (
    BookingStatus,
    VendorItemCreate,
    VendorItemResponse,
    VendorItemUpdate,
    VendorListResponse,
)


class VendorService:
    """Service handling vendor checklist items, quotation comparisons, and bookings."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.vendor_repo = VendorRepository(db)
        self.event_repo = EventRepository(db)

    async def get_vendors(self, event_id: str, user_id: str) -> VendorListResponse:
        """Retrieve all vendor checklist items grouped by category with metrics."""
        event = await self.event_repo.find_by_id_and_user(event_id, user_id)
        if not event:
            raise NotFoundError("Event not found or unauthorized.")

        raw_items = await self.vendor_repo.find_all_by_event(event_id, user_id)

        items_resp: list[VendorItemResponse] = []
        by_category: dict[str, list[VendorItemResponse]] = defaultdict(list)
        booked_count = 0
        total_quoted = 0.0

        for r in raw_items:
            quote = round(float(r.get("quotation_amount", 0.0)), 2)
            total_quoted += quote
            if r.get("booking_status") == BookingStatus.BOOKED.value:
                booked_count += 1

            item = VendorItemResponse(
                id=r["id"],
                event_id=r["event_id"],
                user_id=r["user_id"],
                category=r["category"],
                item_name=r["item_name"],
                quotation_amount=quote,
                booking_status=r.get("booking_status", BookingStatus.NOT_STARTED.value),
                payment_status=r.get("payment_status", "unpaid"),
                notes=r.get("notes"),
                contact_info=r.get("contact_info"),
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
            items_resp.append(item)
            by_category[item.category.value].append(item)

        return VendorListResponse(
            items=items_resp,
            total_vendors=len(items_resp),
            booked_count=booked_count,
            total_quoted_amount=round(total_quoted, 2),
            items_by_category=dict(by_category),
        )

    async def add_vendor(
        self, event_id: str, user_id: str, req: VendorItemCreate
    ) -> VendorItemResponse:
        """Add a vendor checklist item."""
        event = await self.event_repo.find_by_id_and_user(event_id, user_id)
        if not event:
            raise NotFoundError("Event not found or unauthorized.")

        if req.quotation_amount < 0.0:
            raise ValidationError("Quotation amount cannot be negative.")

        data = {
            "event_id": event_id,
            "user_id": user_id,
            "category": req.category.value,
            "item_name": req.item_name.strip(),
            "quotation_amount": round(float(req.quotation_amount), 2),
            "booking_status": req.booking_status.value,
            "payment_status": req.payment_status.value,
            "notes": req.notes.strip() if req.notes else None,
            "contact_info": req.contact_info.strip() if req.contact_info else None,
        }

        doc = await self.vendor_repo.insert(data)
        return VendorItemResponse(**doc)

    async def update_vendor(
        self, item_id: str, event_id: str, user_id: str, req: VendorItemUpdate
    ) -> VendorItemResponse:
        """Update a vendor checklist item."""
        existing = await self.vendor_repo.find_by_id_and_event(item_id, event_id, user_id)
        if not existing:
            raise NotFoundError("Vendor item not found or unauthorized.")

        updates = {}
        if req.category is not None:
            updates["category"] = req.category.value
        if req.item_name is not None:
            updates["item_name"] = req.item_name.strip()
        if req.quotation_amount is not None:
            if req.quotation_amount < 0.0:
                raise ValidationError("Quotation amount cannot be negative.")
            updates["quotation_amount"] = round(float(req.quotation_amount), 2)
        if req.booking_status is not None:
            updates["booking_status"] = req.booking_status.value
        if req.payment_status is not None:
            updates["payment_status"] = req.payment_status.value
        if req.notes is not None:
            updates["notes"] = req.notes.strip() if req.notes else None
        if req.contact_info is not None:
            updates["contact_info"] = req.contact_info.strip() if req.contact_info else None

        updated = await self.vendor_repo.update_by_id_and_event(item_id, event_id, user_id, updates)
        if not updated:
            raise NotFoundError("Vendor item not found.")
        return VendorItemResponse(**updated)

    async def delete_vendor(self, item_id: str, event_id: str, user_id: str) -> bool:
        """Delete a vendor checklist item."""
        deleted = await self.vendor_repo.delete_by_id_and_event(item_id, event_id, user_id)
        if not deleted:
            raise NotFoundError("Vendor item not found or unauthorized.")
        return True
