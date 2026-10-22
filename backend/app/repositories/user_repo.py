"""User repository for database interactions."""

from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    """Repository handling User document persistence."""

    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "users")

    async def find_by_email(self, email: str) -> dict[str, Any] | None:
        """Find a user document by lowercase email."""
        doc = await self.collection.find_one({"email": email.lower().strip()})
        return self.serialize_doc(doc)
