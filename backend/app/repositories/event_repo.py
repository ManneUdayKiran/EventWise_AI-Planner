"""Event repository handling event document persistence and cascade deletions."""

from datetime import UTC, datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository


class EventRepository(BaseRepository):
    """Repository handling Event document persistence."""

    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "events")

    async def find_all_by_user(self, user_id: str) -> list[dict[str, Any]]:
        """List all events belonging to a user, sorted newest first."""
        cursor = self.collection.find({"user_id": user_id}).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        return [self.serialize_doc(doc) for doc in docs if doc is not None]

    async def find_by_id_and_user(self, event_id: str, user_id: str) -> dict[str, Any] | None:
        """Find an event by ID enforcing user ownership."""
        oid = self.to_object_id(event_id)
        if not oid:
            return None
        doc = await self.collection.find_one({"_id": oid, "user_id": user_id})
        return self.serialize_doc(doc)

    async def update_by_id_and_user(
        self, event_id: str, user_id: str, updates: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Update an event by ID enforcing user ownership."""
        oid = self.to_object_id(event_id)
        if not oid:
            return None
        payload = dict(updates)
        payload["updated_at"] = datetime.now(UTC)

        result = await self.collection.update_one(
            {"_id": oid, "user_id": user_id},
            {"$set": payload},
        )
        if result.matched_count == 0:
            return None
        return await self.find_by_id_and_user(event_id, user_id)

    async def delete_cascade(self, event_id: str, user_id: str) -> bool:
        """Delete an event and cascade deletion to its budget items, tasks, and vendors."""
        oid = self.to_object_id(event_id)
        if not oid:
            return False

        # Verify ownership first
        event = await self.collection.find_one({"_id": oid, "user_id": user_id})
        if not event:
            return False

        # Cascade delete all child collections
        await self.db.budget_items.delete_many({"event_id": event_id})
        await self.db.tasks.delete_many({"event_id": event_id})
        await self.db.vendor_items.delete_many({"event_id": event_id})
        await self.db.ai_proposals.delete_many({"event_id": event_id})

        # Delete event document
        res = await self.collection.delete_one({"_id": oid, "user_id": user_id})
        return res.deleted_count > 0
