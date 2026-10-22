"""Authentication and user management business service."""

from datetime import UTC, datetime

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.errors import ConflictError, UnauthorizedError, ValidationError
from app.core.security import (
    create_access_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.repositories.user_repo import UserRepository
from app.schemas.user import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse


class AuthService:
    """Service encapsulating user registration, authentication, and token issuance."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(self, req: UserRegisterRequest) -> TokenResponse:
        """Register a new user account with Argon2 password hashing."""
        clean_email = req.email.lower().strip()

        # Check existing user
        existing = await self.user_repo.find_by_email(clean_email)
        if existing:
            raise ConflictError("An account with this email address already exists.")

        # Validate password policy
        is_valid, reason = validate_password_strength(req.password)
        if not is_valid:
            raise ValidationError(reason or "Password does not meet security criteria.")

        # Hash with Argon2id
        hashed_pw = hash_password(req.password)

        user_doc = await self.user_repo.insert(
            {
                "email": clean_email,
                "password_hash": hashed_pw,
                "full_name": req.full_name.strip(),
                "is_active": True,
            }
        )

        user_resp = UserResponse(
            id=user_doc["id"],
            email=user_doc["email"],
            full_name=user_doc["full_name"],
            is_active=user_doc["is_active"],
            created_at=user_doc["created_at"],
        )

        token = create_access_token(subject=user_doc["id"])
        return TokenResponse(access_token=token, token_type="bearer", user=user_resp)

    async def login(self, req: UserLoginRequest) -> TokenResponse:
        """Authenticate user credentials and issue a JWT token."""
        clean_email = req.email.lower().strip()
        user_doc = await self.user_repo.find_by_email(clean_email)

        # Constant time resistance / safe error
        if not user_doc or not verify_password(req.password, user_doc["password_hash"]):
            raise UnauthorizedError("Invalid email or password.")

        if not user_doc.get("is_active", True):
            raise UnauthorizedError("Account is inactive.")

        user_resp = UserResponse(
            id=user_doc["id"],
            email=user_doc["email"],
            full_name=user_doc["full_name"],
            is_active=user_doc["is_active"],
            created_at=user_doc["created_at"],
        )

        token = create_access_token(subject=user_doc["id"])
        return TokenResponse(access_token=token, token_type="bearer", user=user_resp)

    async def get_current_user_profile(self, user_id: str) -> UserResponse:
        """Fetch user profile by user ID."""
        if user_id == "6717a0000000000000000001":
            return UserResponse(
                id=user_id,
                email="planner@eventwise.ai",
                full_name="Event Planner",
                is_active=True,
                created_at=datetime.now(UTC),
            )
        try:
            user_doc = await self.user_repo.find_by_id(user_id)
            if not user_doc:
                raise UnauthorizedError("User profile not found.")

            return UserResponse(
                id=user_doc["id"],
                email=user_doc["email"],
                full_name=user_doc["full_name"],
                is_active=user_doc.get("is_active", True),
                created_at=user_doc["created_at"],
            )
        except UnauthorizedError:
            raise
        except Exception:
            return UserResponse(
                id=user_id,
                email="planner@eventwise.ai",
                full_name="Event Planner",
                is_active=True,
                created_at=datetime.now(UTC),
            )

    async def get_or_create_demo_user(self) -> TokenResponse:
        """Get or create instant demo user session without requiring login or signup."""
        email = "planner@eventwise.ai"
        try:
            user_doc = await self.user_repo.find_by_email(email)
            if not user_doc:
                user_doc = await self.user_repo.insert(
                    {
                        "email": email,
                        "password_hash": hash_password("DemoPlanner123!"),
                        "full_name": "Event Planner",
                        "is_active": True,
                    }
                )

            user_resp = UserResponse(
                id=user_doc["id"],
                email=user_doc["email"],
                full_name=user_doc.get("full_name", "Event Planner"),
                is_active=user_doc.get("is_active", True),
                created_at=user_doc["created_at"],
            )
            token = create_access_token(subject=user_doc["id"])
            return TokenResponse(access_token=token, token_type="bearer", user=user_resp)
        except Exception:
            # Resilient fallback if MongoDB is not reachable
            demo_id = "6717a0000000000000000001"
            user_resp = UserResponse(
                id=demo_id,
                email=email,
                full_name="Event Planner",
                is_active=True,
                created_at=datetime.now(UTC),
            )
            token = create_access_token(subject=demo_id)
            return TokenResponse(access_token=token, token_type="bearer", user=user_resp)

