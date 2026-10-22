"""Database manager (MongoDB removed in favor of client-side localStorage)."""

import logging

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Mock/stateless database manager - client-side localStorage handles persistence."""

    def __init__(self):
        self.client = None
        self.db = None
        self.is_connected: bool = True

    async def connect(self, mongodb_url: str | None = None, db_name: str | None = None):
        """No-op connection since persistence is handled by client-side localStorage."""
        logger.info("Storage is handled by client-side localStorage. MongoDB connection skipped.")
        self.is_connected = True

    async def disconnect(self):
        """No-op disconnect."""
        self.is_connected = False

    async def _init_indexes(self):
        """No-op index initialization since MongoDB is removed."""
        pass


db_manager = DatabaseManager()


def get_database():
    """Stub database dependency."""
    return None
