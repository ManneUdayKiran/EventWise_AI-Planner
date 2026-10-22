"""User schemas for registration, login, and responses."""

from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.common import BaseSchema


class UserRegisterRequest(BaseSchema):
    """Registration request payload."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=100)


class UserLoginRequest(BaseSchema):
    """Login request payload."""

    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserResponse(BaseSchema):
    """Public user response representation."""

    id: str
    email: EmailStr
    full_name: str
    is_active: bool = True
    created_at: datetime


class TokenResponse(BaseSchema):
    """Authentication token response."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
