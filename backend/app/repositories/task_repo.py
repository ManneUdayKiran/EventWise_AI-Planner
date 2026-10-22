"""Task repository handling MongoDB queries for event tasks."""

from datetime import UTC, datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository):
    """Repository handling Task document persistence."""

    def __init__(self, db: AsyncIOMotorDatabase | None):
        super().__init__(db, "tasks")

    async def find_all_by_event(self, event_id: str, user_id: str) -> list[dict[str, Any]]:
        """List all tasks for an event, sorted chronologically by due date."""
        if self.collection is None:
            return []
        cursor = self.collection.find({"event_id": event_id, "user_id": user_id}).sort(
            "due_date", 1
        )
        docs = await cursor.to_list(length=500)
        return [self.serialize_doc(doc) for doc in docs if doc is not None]

    async def find_by_id_and_event(
        self, task_id: str, event_id: str, user_id: str
    ) -> dict[str, Any] | None:
        """Retrieve single task enforcing event and ownership."""
        if self.collection is None:
            return None
        oid = self.to_object_id(task_id)
        if not oid:
            return None
        doc = await self.collection.find_one({"_id": oid, "event_id": event_id, "user_id": user_id})
        return self.serialize_doc(doc)

    async def update_by_id_and_event(
        self, task_id: str, event_id: str, user_id: str, updates: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Update a task enforcing event and ownership."""
        if self.collection is None:
            return None
        oid = self.to_object_id(task_id)
        if not oid:
            return None
        payload = dict(updates)
        payload["updated_at"] = datetime.now(UTC)

        result = await self.collection.update_one(
            {"_id": oid, "event_id": event_id, "user_id": user_id},
            {"$set": payload},
        )
        if result.matched_count == 0:
            return None
        return await self.find_by_id_and_event(task_id, event_id, user_id)

    async def delete_by_id_and_event(self, task_id: str, event_id: str, user_id: str) -> bool:
        """Delete a single task enforcing event and ownership."""
        if self.collection is None:
            return False
        oid = self.to_object_id(task_id)
        if not oid:
            return False
        result = await self.collection.delete_one(
            {"_id": oid, "event_id": event_id, "user_id": user_id}
        )
        return result.deleted_count > 0
