"""Security tests for authentication, headers, and token tampering."""

from datetime import timedelta

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_expired_token_rejected(client: AsyncClient):
    """Verify expired token is rejected with 401."""
    expired_token = create_access_token(
        subject="expired_user_id",
        expires_delta=timedelta(seconds=-60),
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = await client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401
    assert "Invalid or expired" in response.json()["detail"]


@pytest.mark.asyncio
async def test_tampered_token_rejected(client: AsyncClient, sample_user):
    """Verify modified token signature is rejected with 401."""
    real_token = sample_user["token"]
    tampered_token = real_token[:-6] + "xxxxxx"
    headers = {"Authorization": f"Bearer {tampered_token}"}
    response = await client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_security_headers_present(client: AsyncClient):
    """Verify required HTTP security headers are included in responses."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


@pytest.mark.asyncio
async def test_invalid_email_format_rejected(client: AsyncClient):
    """Verify Pydantic rejects invalid email formats with 422."""
    payload = {
        "email": "not-an-email",
        "password": "ValidPassword123!",
        "full_name": "Invalid Email User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
