"""Integration tests for Auth API endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_api_health_check(client: AsyncClient):
    """Verify /health returns 200 OK and expected metadata."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


@pytest.mark.asyncio
async def test_api_register_endpoint(client: AsyncClient):
    """Verify POST /api/v1/auth/register creates user and returns token."""
    payload = {
        "email": "api_user@example.com",
        "password": "StrongPassword123!",
        "full_name": "API User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "api_user@example.com"
    assert data["user"]["full_name"] == "API User"


@pytest.mark.asyncio
async def test_api_login_endpoint(client: AsyncClient):
    """Verify POST /api/v1/auth/login logs in user and returns token."""
    register_payload = {
        "email": "login_api@example.com",
        "password": "MySecretPassword123!",
        "full_name": "Login API User",
    }
    reg_res = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg_res.status_code == 201

    login_payload = {
        "email": "login_api@example.com",
        "password": "MySecretPassword123!",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "login_api@example.com"


@pytest.mark.asyncio
async def test_api_get_me_authenticated(client: AsyncClient, sample_user):
    """Verify GET /api/v1/auth/me returns current user profile with token."""
    response = await client.get("/api/v1/auth/me", headers=sample_user["headers"])
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sample_user["id"]
    assert data["email"] == sample_user["email"]


@pytest.mark.asyncio
async def test_api_get_me_unauthorized(client: AsyncClient):
    """Verify GET /api/v1/auth/me fails with 401 when missing token."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "detail" in response.json()
