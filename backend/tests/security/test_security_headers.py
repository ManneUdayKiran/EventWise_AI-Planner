"""Security verification tests for HTTP security headers, CORS policies, and sanitized error responses."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_security_headers_present(client: AsyncClient):
    """Verify essential defensive security headers are returned on all API responses."""
    response = await client.get("/health")
    assert response.status_code == 200

    headers = response.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


@pytest.mark.asyncio
async def test_cors_headers_allowed_origin(client: AsyncClient):
    """Verify CORS preflight and standard requests return valid access headers for configured origins."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Authorization,Content-Type",
    }
    response = await client.options("/api/v1/events", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "POST" in response.headers.get("access-control-allow-methods", "")


@pytest.mark.asyncio
async def test_cors_vercel_origin_allowed(client: AsyncClient):
    """Verify Vercel origins are recognized and permitted by regex."""
    headers = {
        "Origin": "https://eventwise-ai-planner.vercel.app",
        "Access-Control-Request-Method": "GET",
    }
    response = await client.options("/api/v1/events", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://eventwise-ai-planner.vercel.app"


@pytest.mark.asyncio
async def test_cors_disallowed_origin_rejected(client: AsyncClient):
    """Verify unauthorized external origins are not granted access-control headers."""
    headers = {"Origin": "https://malicious-attacker-website.com"}
    response = await client.get("/health", headers=headers)
    # When origin is disallowed, CORS middleware must not return access-control-allow-origin for that domain
    assert response.headers.get("access-control-allow-origin") != "https://malicious-attacker-website.com"


@pytest.mark.asyncio
async def test_sanitized_error_responses(client: AsyncClient):
    """Verify API error messages do not leak internal system paths, traceback stacks, or database details."""
    response = await client.get("/api/v1/events/invalid-non-existent-id")
    # Must fail safely with 401 Unauthorized (unauthenticated) or 404 (not found)
    assert response.status_code in (401, 404, 422)

    data = response.json()
    assert "detail" in data
    detail_str = str(data["detail"]).lower()

    # Ensure internal implementation details are not exposed
    forbidden_terms = ["traceback", "file \"c:\\", "file \"/usr", "mongodb", "motor", "pymongo", "password_hash"]
    for term in forbidden_terms:
        assert term not in detail_str
