"""Tests verifying rate limiting middleware enforcement and 429 throttling."""

import pytest
from httpx import AsyncClient

from app.core.config import get_settings


@pytest.mark.asyncio
async def test_rate_limit_enforcement(client: AsyncClient):
    """Verify rate limiter blocks client requests once request threshold is exceeded."""
    settings = get_settings()
    original_enabled = settings.RATE_LIMIT_ENABLED
    original_limit = settings.RATE_LIMIT_REQUESTS_PER_MINUTE

    try:
        # Enable rate limiting with a small test threshold of 3 requests per minute
        settings.RATE_LIMIT_ENABLED = True
        settings.RATE_LIMIT_REQUESTS_PER_MINUTE = 3

        # First 3 requests should pass through to auth endpoint
        for _ in range(3):
            res = await client.get("/api/v1/auth/me")
            # 401 is expected since no auth token is provided, but it is NOT rate-limited
            assert res.status_code == 401

        # The 4th request from the same client IP must be throttled with 429
        throttled_res = await client.get("/api/v1/auth/me")
        assert throttled_res.status_code == 429
        data = throttled_res.json()
        assert "rate limit exceeded" in data["detail"].lower()
        assert throttled_res.headers.get("Retry-After") == "60"

    finally:
        # Restore test suite settings
        settings.RATE_LIMIT_ENABLED = original_enabled
        settings.RATE_LIMIT_REQUESTS_PER_MINUTE = original_limit
