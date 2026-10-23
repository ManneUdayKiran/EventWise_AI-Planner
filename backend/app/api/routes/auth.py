"""Authentication API endpoints."""

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_database, get_strict_current_user
from app.schemas.user import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    req: UserRegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> TokenResponse:
    """Register a new user account using Argon2id password hashing."""
    service = AuthService(db)
    return await service.register(req)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login with JWT authentication",
)
async def login(
    req: UserLoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> TokenResponse:
    """Authenticate email and password, returning JWT access token."""
    service = AuthService(db)
    return await service.login(req)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
)
async def get_me(
    current_user: UserResponse = Depends(get_strict_current_user),
) -> UserResponse:
    """Retrieve profile of the currently authenticated user."""
    return current_user


@router.post(
    "/demo",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Get instant demo planner session token",
)
async def demo_session(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> TokenResponse:
    """Get or create instant demo user session without requiring login or signup."""
    service = AuthService(db)
    return await service.get_or_create_demo_user()
