"""Base repository providing generic MongoDB CRUD operations."""

from datetime import UTC, datetime
from typing import Any, overload

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class BaseRepository:
    """Base repository class for MongoDB collections."""

    def __init__(self, db: AsyncIOMotorDatabase | None, collection_name: str):
        self.db = db
        self.collection: Any = db[collection_name] if db is not None else None

    @staticmethod
    def to_object_id(id_str: str) -> ObjectId | None:
        """Safely convert a string to a BSON ObjectId."""
        try:
            return ObjectId(id_str)
        except Exception:
            return None

    @overload
    @staticmethod
    def serialize_doc(doc: None) -> None: ...

    @overload
    @staticmethod
    def serialize_doc(doc: dict[str, Any]) -> dict[str, Any]: ...

    @staticmethod
    def serialize_doc(doc: dict[str, Any] | None) -> dict[str, Any] | None:
        """Serialize a MongoDB document with string ID."""
        if not doc:
            return None
        res = dict(doc)
        if "_id" in res:
            res["id"] = str(res.pop("_id"))
        # Convert any foreign key ObjectIds to strings
        for k, v in res.items():
            if isinstance(v, ObjectId):
                res[k] = str(v)
        return res

    async def find_by_id(self, item_id: str) -> dict[str, Any] | None:
        """Find a single document by string ID."""
        if self.collection is None:
            return None
        oid = self.to_object_id(item_id)
        if not oid:
            return None
        doc = await self.collection.find_one({"_id": oid})
        return self.serialize_doc(doc)

    async def insert(self, data: dict[str, Any]) -> dict[str, Any]:
        """Insert a document and return the serialized result."""
        payload = dict(data)
        now = datetime.now(UTC)
        if "created_at" not in payload:
            payload["created_at"] = now
        if "updated_at" not in payload:
            payload["updated_at"] = now

        if self.collection is not None:
            result = await self.collection.insert_one(payload)
            payload["id"] = str(result.inserted_id)
        else:
            payload["id"] = str(ObjectId())
        payload.pop("_id", None)
        return payload

    async def update_by_id(self, item_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        """Update a document by string ID."""
        if self.collection is None:
            return None
        oid = self.to_object_id(item_id)
        if not oid:
            return None
        payload = dict(updates)
        payload["updated_at"] = datetime.now(UTC)

        await self.collection.update_one({"_id": oid}, {"$set": payload})
        return await self.find_by_id(item_id)

    async def delete_by_id(self, item_id: str) -> bool:
        """Delete a document by string ID."""
        if self.collection is None:
            return False
        oid = self.to_object_id(item_id)
        if not oid:
            return False
        result = await self.collection.delete_one({"_id": oid})
        return result.deleted_count > 0
