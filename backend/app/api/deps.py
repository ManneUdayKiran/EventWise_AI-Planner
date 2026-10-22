"""FastAPI dependency injection utilities."""

from datetime import UTC, datetime

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.security import decode_access_token
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserResponse

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserResponse:
    """Validate Bearer token or fallback seamlessly to default demo planner user."""
    if not auth or not auth.credentials:
        from app.services.auth_service import AuthService
        service = AuthService(db)
        demo = await service.get_or_create_demo_user()
        return demo.user

    payload = decode_access_token(auth.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    user_repo = UserRepository(db)
    user_doc = await user_repo.find_by_id(user_id)

    if not user_doc:
        # If token was for demo user or user was recreated, provide demo user
        from app.services.auth_service import AuthService
        service = AuthService(db)
        demo = await service.get_or_create_demo_user()
        return demo.user

    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return UserResponse(
        id=user_doc["id"],
        email=user_doc["email"],
        full_name=user_doc.get("full_name", ""),
        is_active=user_doc.get("is_active", True),
        created_at=user_doc.get("created_at") or datetime.now(UTC),
    )


async def get_strict_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserResponse:
    """Validate Bearer token strictly for endpoints requiring explicit authentication."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await get_current_user(auth, db)

