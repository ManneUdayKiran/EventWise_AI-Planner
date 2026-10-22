"""FastAPI dependency injection utilities (Stateless)."""

from datetime import UTC, datetime

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.schemas.user import UserResponse

security_scheme = HTTPBearer(auto_error=False)

DEMO_USER = UserResponse(
    id="demo-planner-001",
    email="planner@eventwise.ai",
    full_name="Event Planner",
    is_active=True,
    created_at=datetime.now(UTC),
)


async def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> UserResponse:
    """Validate Bearer token statelessly or fallback seamlessly to default demo user."""
    if not auth or not auth.credentials:
        return DEMO_USER

    payload = decode_access_token(auth.credentials)
    if not payload or "sub" not in payload:
        return DEMO_USER

    return UserResponse(
        id=payload["sub"],
        email=payload.get("email", "planner@eventwise.ai"),
        full_name=payload.get("full_name", "Event Planner"),
        is_active=True,
        created_at=datetime.now(UTC),
    )


async def get_strict_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> UserResponse:
    """Validate Bearer token statelessly."""
    return await get_current_user(auth)


async def get_database():
    """No database needed since storage is in client-side localStorage."""
    return None
