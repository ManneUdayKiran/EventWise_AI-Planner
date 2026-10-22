"""Event Pydantic schemas for request, update, and response payloads."""

from datetime import datetime
from enum import Enum

from pydantic import Field

from app.schemas.common import BaseSchema


class EventType(str, Enum):
    """Popular supported event categories."""

    WEDDING = "wedding"
    BIRTHDAY = "birthday"
    COMMUNITY = "community"
    CORPORATE = "corporate"
    CONFERENCE = "conference"
    ANNIVERSARY = "anniversary"
    CONCERT = "concert"
    PARTY = "party"
    HACKATHON = "hackathon"
    GALA = "gala"
    OTHER = "other"


class EventStatus(str, Enum):
    """Event planning lifecycle status."""

    DRAFT = "draft"
    PLANNING = "planning"
    READY = "ready"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class EventBase(BaseSchema):
    """Base event attributes."""

    name: str = Field(..., min_length=2, max_length=120, description="Name of the event")
    event_type: str = Field(
        ..., min_length=2, max_length=80, description="Event type: wedding, birthday, community, or custom"
    )
    event_date: datetime = Field(..., description="Target date and time in UTC")
    location: str = Field(..., min_length=2, max_length=200, description="Event location or venue")
    expected_guest_count: int = Field(
        ..., ge=0, le=100000, description="Expected guest attendance count"
    )
    total_budget: float = Field(..., ge=0.0, description="Total planned monetary budget")
    currency: str = Field(
        default="INR", min_length=3, max_length=3, description="3-letter currency code (e.g. INR)"
    )
    theme: str | None = Field(default=None, max_length=200, description="Theme or styling")
    preferences: str | None = Field(
        default=None, max_length=1000, description="Specific preferences (food, music, etc.)"
    )
    special_requirements: str | None = Field(
        default=None,
        max_length=1000,
        description="Accessibility, dietary, or logistics requirements",
    )


class EventCreate(EventBase):
    """Event creation request."""

    pass


class EventUpdate(BaseSchema):
    """Event update request with optional fields."""

    name: str | None = Field(default=None, min_length=2, max_length=120)
    event_type: str | None = Field(default=None, min_length=2, max_length=80)

    event_date: datetime | None = None
    location: str | None = Field(default=None, min_length=2, max_length=200)
    expected_guest_count: int | None = Field(default=None, ge=0, le=100000)
    total_budget: float | None = Field(default=None, ge=0.0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    theme: str | None = Field(default=None, max_length=200)
    preferences: str | None = Field(default=None, max_length=1000)
    special_requirements: str | None = Field(default=None, max_length=1000)
    status: EventStatus | None = None


class EventResponse(EventBase):
    """Event response representation."""

    id: str
    user_id: str
    status: EventStatus
    created_at: datetime
    updated_at: datetime


class EventSummaryStats(BaseSchema):
    """High level event planning progress metrics."""

    budget_allocated: float = 0.0
    budget_spent: float = 0.0
    budget_remaining: float = 0.0
    total_tasks: int = 0
    completed_tasks: int = 0
    overdue_tasks: int = 0
    task_progress_percentage: float = 0.0
    total_vendors: int = 0
    booked_vendors: int = 0


class EventDetailResponse(EventResponse):
    """Detailed event response with summary statistics."""

    stats: EventSummaryStats = Field(default_factory=EventSummaryStats)
