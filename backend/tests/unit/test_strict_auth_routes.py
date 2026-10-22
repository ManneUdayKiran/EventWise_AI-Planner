"""Integration/regression tests for strict authentication on routes."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_me_unauthenticated_returns_401(client: AsyncClient):
    """Accessing /api/v1/auth/me without token must be strictly rejected with 401."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data or "detail" in data


@pytest.mark.asyncio
async def test_get_me_invalid_token_returns_401(client: AsyncClient):
    """Accessing /api/v1/auth/me with invalid Bearer token must return 401."""
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.token.payload"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_valid_token_returns_user_profile(
    client: AsyncClient,
    sample_user: dict,
):
    """Accessing /api/v1/auth/me with valid Bearer token returns the user profile."""
    response = await client.get(
        "/api/v1/auth/me",
        headers=sample_user["headers"],
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == sample_user["email"]
    assert data["id"] == sample_user["id"]
