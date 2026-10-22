"""Unit tests for Argon2 hashing, password validation, and JWT handling."""

from datetime import timedelta

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    validate_password_strength,
    verify_password,
)


def test_argon2_password_hashing():
    """Verify Argon2 produces valid hash and verifies plaintext match."""
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)

    assert hashed.startswith("$argon2id$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_password_strength_validation():
    """Verify password policy rejects weak and accepts strong passwords."""
    # Too short
    valid, err = validate_password_strength("Short1!")
    assert not valid
    assert "at least 8 characters" in err

    # No numbers or symbols
    valid, err = validate_password_strength("allletterspassword")
    assert not valid
    assert "number or special character" in err

    # Valid
    valid, err = validate_password_strength("ValidPassword123!")
    assert valid
    assert err is None


def test_jwt_token_creation_and_decoding():
    """Verify JWT encodes claims, subject, and decodes properly."""
    sub = "user_12345"
    token = create_access_token(subject=sub, claims={"role": "planner"})
    payload = decode_access_token(token)

    assert payload is not None
    assert payload["sub"] == sub
    assert payload["role"] == "planner"
    assert "exp" in payload
    assert "iat" in payload


def test_jwt_token_expiration():
    """Verify expired JWT tokens return None."""
    sub = "user_expired"
    # Token expired 10 seconds ago
    token = create_access_token(subject=sub, expires_delta=timedelta(seconds=-10))
    payload = decode_access_token(token)
    assert payload is None


def test_jwt_invalid_signature():
    """Verify tampered JWT returns None."""
    token = create_access_token(subject="user_tamper")
    tampered_token = token[:-4] + "abcd"
    assert decode_access_token(tampered_token) is None
