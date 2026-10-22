"""MongoDB connection and database management via Motor."""

import pymongo
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings


class DatabaseManager:
    """Manages Motor AsyncIOMotorClient lifecycle and database access."""

    def __init__(self):
        self.client: AsyncIOMotorClient | None = None
        self.db: AsyncIOMotorDatabase | None = None

    async def connect(self, mongodb_url: str | None = None, db_name: str | None = None):
        """Establish asynchronous connection to MongoDB."""
        settings = get_settings()
        url = mongodb_url or settings.MONGODB_URL
        name = db_name or settings.DB_NAME

        self.client = AsyncIOMotorClient(url)
        self.db = self.client[name]

        # Initialize required indexes for query performance and data integrity
        await self._init_indexes()

    async def disconnect(self):
        """Close MongoDB connection pool."""
        if self.client:
            self.client.close()
            self.client = None
            self.db = None

    async def _init_indexes(self):
        """Create necessary indexes for all collections."""
        if self.db is None:
            return

        # Users: Unique email index
        await self.db.users.create_index(
            [("email", pymongo.ASCENDING)],
            unique=True,
            name="uniq_user_email",
        )

        # Events: User events ordered by creation
        await self.db.events.create_index(
            [("user_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)],
            name="idx_user_events",
        )

        # Budget Items: By event and category
        await self.db.budget_items.create_index(
            [("event_id", pymongo.ASCENDING), ("category", pymongo.ASCENDING)],
            name="idx_event_category_budget",
        )
        await self.db.budget_items.create_index(
            [("user_id", pymongo.ASCENDING)],
            name="idx_budget_user",
        )

        # Tasks: By event, due date, and status
        await self.db.tasks.create_index(
            [("event_id", pymongo.ASCENDING), ("due_date", pymongo.ASCENDING)],
            name="idx_event_task_due",
        )
        await self.db.tasks.create_index(
            [("event_id", pymongo.ASCENDING), ("status", pymongo.ASCENDING)],
            name="idx_event_task_status",
        )

        # Vendor Items: By event and category
        await self.db.vendor_items.create_index(
            [("event_id", pymongo.ASCENDING), ("category", pymongo.ASCENDING)],
            name="idx_event_vendor_category",
        )

        # AI Proposals: By event
        await self.db.ai_proposals.create_index(
            [("event_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)],
            name="idx_event_ai_proposals",
        )


db_manager = DatabaseManager()


def get_database() -> AsyncIOMotorDatabase:
    """Dependency helper to get the active database instance."""
    if db_manager.db is None:
        raise RuntimeError("Database connection not initialized.")
    return db_manager.db
