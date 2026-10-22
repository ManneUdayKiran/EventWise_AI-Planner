"""In-memory rate limiting middleware."""

import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

from app.core.config import get_settings


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Simple sliding-window in-memory rate limiter per client IP."""

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.requests: dict[str, list[float]] = defaultdict(list)
        self.settings = get_settings()

    async def dispatch(self, request: Request, call_next):
        if not self.settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        # Skip rate limit for OPTIONS (CORS preflight), docs, and health
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if path.startswith("/docs") or path.startswith("/openapi.json") or path == "/health":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window = 60.0  # 1 minute window
        limit = self.settings.RATE_LIMIT_REQUESTS_PER_MINUTE

        # Clean timestamps older than window
        timestamps = self.requests[client_ip]
        self.requests[client_ip] = [ts for ts in timestamps if now - ts < window]

        if len(self.requests[client_ip]) >= limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please wait before making more requests."},
                headers={"Retry-After": "60"},
            )

        self.requests[client_ip].append(now)
        response = await call_next(request)
        return response
