"""Unit tests for AuthService logic."""

import pytest

from app.core.errors import ConflictError, UnauthorizedError, ValidationError
from app.schemas.user import UserLoginRequest, UserRegisterRequest
from app.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_auth_service_register_success(test_db):
    """Verify successful user registration and token generation."""
    service = AuthService(test_db)
    req = UserRegisterRequest(
        email="newuser@example.com",
        password="SecurePassword123!",
        full_name="New User",
    )
    res = await service.register(req)

    assert res.access_token is not None
    assert res.token_type == "bearer"
    assert res.user.email == "newuser@example.com"
    assert res.user.full_name == "New User"
    assert res.user.is_active is True


@pytest.mark.asyncio
async def test_auth_service_duplicate_email_conflict(test_db):
    """Verify duplicate email registration raises ConflictError."""
    service = AuthService(test_db)
    req = UserRegisterRequest(
        email="duplicate@example.com",
        password="SecurePassword123!",
        full_name="User One",
    )
    await service.register(req)

    # Attempt to register again with same email
    with pytest.raises(ConflictError):
        await service.register(req)


@pytest.mark.asyncio
async def test_auth_service_weak_password_validation(test_db):
    """Verify password lacking numbers or special characters raises ValidationError."""
    service = AuthService(test_db)
    req = UserRegisterRequest(
        email="weak@example.com",
        password="allletterspassword",
        full_name="Weak User",
    )
    with pytest.raises(ValidationError):
        await service.register(req)


@pytest.mark.asyncio
async def test_auth_service_login_success(test_db):
    """Verify login with correct credentials returns valid token."""
    service = AuthService(test_db)
    reg_req = UserRegisterRequest(
        email="login_test@example.com",
        password="Password123!",
        full_name="Login Tester",
    )
    await service.register(reg_req)

    login_req = UserLoginRequest(
        email="login_test@example.com",
        password="Password123!",
    )
    res = await service.login(login_req)

    assert res.access_token is not None
    assert res.user.email == "login_test@example.com"


@pytest.mark.asyncio
async def test_auth_service_login_invalid_password(test_db):
    """Verify login with incorrect password raises UnauthorizedError."""
    service = AuthService(test_db)
    reg_req = UserRegisterRequest(
        email="wrong_pw@example.com",
        password="CorrectPassword123!",
        full_name="Wrong PW Tester",
    )
    await service.register(reg_req)

    login_req = UserLoginRequest(
        email="wrong_pw@example.com",
        password="WrongPassword123!",
    )
    with pytest.raises(UnauthorizedError):
        await service.login(login_req)
