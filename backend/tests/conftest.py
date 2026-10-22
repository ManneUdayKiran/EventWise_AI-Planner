"""Pytest configuration, database fixtures, and test client setup."""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.database import db_manager
from app.core.security import create_access_token, hash_password
from app.main import app

TEST_DB_NAME = "eventwise_test_db"


@pytest_asyncio.fixture
async def test_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """Provide an isolated test database for a test."""
    settings = get_settings()
    settings.RATE_LIMIT_ENABLED = False
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[TEST_DB_NAME]
    db_manager.client = client
    db_manager.db = db

    # Clean existing collections
    collections = await db.list_collection_names()
    for col in collections:
        if not col.startswith("system."):
            await db[col].delete_many({})

    # Initialize indexes
    await db_manager._init_indexes()

    yield db

    # Clean up after test
    collections = await db.list_collection_names()
    for col in collections:
        if not col.startswith("system."):
            await db[col].delete_many({})

    client.close()


@pytest_asyncio.fixture
async def client(test_db: AsyncIOMotorDatabase) -> AsyncGenerator[AsyncClient, None]:
    """Provide an asynchronous HTTPX test client bound to FastAPI ASGI app."""
    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def sample_user(test_db: AsyncIOMotorDatabase) -> dict[str, Any]:
    """Seed a sample user in the test database and return auth credentials."""
    user_data = {
        "email": "planner@example.com",
        "password_hash": hash_password("ValidPassword123!"),
        "full_name": "Planner One",
        "is_active": True,
        "created_at": datetime.now(UTC),
    }
    result = await test_db.users.insert_one(user_data)
    user_id = str(result.inserted_id)
    token = create_access_token(
        subject=user_id,
        claims={"email": user_data["email"], "full_name": user_data["full_name"]},
    )
    return {
        "id": user_id,
        "email": "planner@example.com",
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest_asyncio.fixture
async def other_user(test_db: AsyncIOMotorDatabase) -> dict[str, Any]:
    """Seed a second distinct user in the test database for cross-tenant tests."""
    user_data = {
        "email": "other@example.com",
        "password_hash": hash_password("ValidPassword123!"),
        "full_name": "Other Planner",
        "is_active": True,
        "created_at": datetime.now(UTC),
    }
    result = await test_db.users.insert_one(user_data)
    user_id = str(result.inserted_id)
    token = create_access_token(
        subject=user_id,
        claims={"email": user_data["email"], "full_name": user_data["full_name"]},
    )
    return {
        "id": user_id,
        "email": "other@example.com",
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }
