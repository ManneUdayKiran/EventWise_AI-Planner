"""Database manager for MongoDB Motor connection."""

import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages the MongoDB client connection and indexes."""

    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None
    is_connected: bool = False

    def __init__(self):
        self.client = None
        self.db = None
        self.is_connected = False

    async def connect(self, mongodb_url: str | None = None, db_name: str | None = None):
        """Establish asynchronous connection to MongoDB and initialize collections/indexes."""
        settings = get_settings()
        url = mongodb_url or settings.MONGODB_URL
        name = db_name or settings.DB_NAME
        try:
            self.client = AsyncIOMotorClient(url)
            self.db = self.client[name]
            self.is_connected = True
            await self._init_indexes()
            logger.info("Connected to MongoDB at %s (database: %s)", url, name)
        except Exception as e:
            logger.warning("MongoDB connection failed (%s); operating in resilient mode.", e)
            self.is_connected = False

    async def disconnect(self):
        """Close MongoDB connection pool."""
        if self.client is not None:
            self.client.close()
            self.client = None
            self.db = None
            self.is_connected = False
            logger.info("MongoDB client disconnected.")

    async def _init_indexes(self):
        """Create necessary indexes on MongoDB collections."""
        if self.db is None:
            return
        try:
            # Users unique index
            await self.db.users.create_index("email", unique=True)
            # Events index by user
            await self.db.events.create_index([("user_id", 1), ("created_at", -1)])
            # Budget items index
            await self.db.budget_items.create_index([("event_id", 1), ("user_id", 1)])
            # Tasks indexes
            await self.db.tasks.create_index([("event_id", 1), ("user_id", 1)])
            await self.db.tasks.create_index([("due_date", 1)])
            # Vendors index
            await self.db.vendor_items.create_index([("event_id", 1), ("user_id", 1)])
            # AI proposals index
            await self.db.ai_proposals.create_index([("event_id", 1)])
            # Assistant messages index
            await self.db.assistant_messages.create_index([("event_id", 1), ("created_at", 1)])
        except Exception as e:
            logger.warning("Error creating MongoDB indexes: %s", e)


db_manager = DatabaseManager()


def get_database() -> AsyncIOMotorDatabase | None:
    """Dependency provider for the active database."""
    return db_manager.db
