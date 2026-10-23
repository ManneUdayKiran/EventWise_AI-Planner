"""EventWise AI FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.ai.client import ai_http_client
from app.api.routes.ai import router as ai_router
from app.api.routes.assistant import router as assistant_router
from app.api.routes.auth import router as auth_router
from app.api.routes.budget import router as budget_router
from app.api.routes.events import router as events_router
from app.api.routes.tasks import router as tasks_router
from app.api.routes.vendors import router as vendors_router
from app.core.config import get_settings
from app.core.database import db_manager
from app.core.errors import AppError, app_error_handler
from app.core.rate_limit import RateLimiterMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager to clean clients and manage database."""
    settings = get_settings()
    await db_manager.connect(settings.MONGODB_URL, settings.DB_NAME)
    yield
    await ai_http_client.close()
    await db_manager.disconnect()


def create_app() -> FastAPI:
    """Build and configure the FastAPI application instance."""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version="0.1.0",
        description="GenAI-Powered Event Planning Assistant Backend",
        lifespan=lifespan,
    )

    # CORS Middleware - Configured with allowed origins and regex matching
    origins = (
        settings.ALLOWED_ORIGINS
        if isinstance(settings.ALLOWED_ORIGINS, list)
        else [settings.ALLOWED_ORIGINS]
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=settings.ALLOW_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # Rate Limiting Middleware
    app.add_middleware(RateLimiterMiddleware)

    # Security Headers Middleware
    class SecurityHeadersMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            response = await call_next(request)
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            return response

    app.add_middleware(SecurityHeadersMiddleware)

    # Custom Exception Handlers with guaranteed CORS header preservation
    app.add_exception_handler(AppError, app_error_handler)

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        origin = request.headers.get("origin") or "*"
        headers = {
            "Access-Control-Allow-Origin": origin,
        }
        content = {"detail": "Internal server error"}
        if settings.DEBUG or settings.ENVIRONMENT == "development":
            content["error"] = str(exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=content,
            headers=headers,
        )

    # Health Check
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "storage": "client-localstorage",
            "ai_engine": "groq-online",
            "app": settings.APP_NAME,
            "version": "0.1.0",
            "environment": settings.ENVIRONMENT,
        }

    # Mount API v1 Routes
    app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
    app.include_router(events_router, prefix=settings.API_V1_PREFIX)
    app.include_router(budget_router, prefix=settings.API_V1_PREFIX)
    app.include_router(tasks_router, prefix=settings.API_V1_PREFIX)
    app.include_router(vendors_router, prefix=settings.API_V1_PREFIX)
    app.include_router(ai_router, prefix=settings.API_V1_PREFIX)
    app.include_router(assistant_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()
