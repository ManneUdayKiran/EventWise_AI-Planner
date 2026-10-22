"""Common schema types and helpers."""

from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict


def utc_now() -> datetime:
    """Return current UTC timestamp."""
    return datetime.now(UTC)


class BaseSchema(BaseModel):
    """Base Pydantic model with common configurations."""

    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
        extra="forbid",
    )
