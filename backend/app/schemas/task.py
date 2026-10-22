"""Timeline and planning task Pydantic schemas."""

from datetime import datetime
from enum import Enum

from pydantic import Field

from app.schemas.common import BaseSchema


class TaskPriority(str, Enum):
    """Task urgency levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    """Task progress state."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class TaskBase(BaseSchema):
    """Base task attributes."""

    title: str = Field(..., min_length=2, max_length=200, description="Task title")
    description: str | None = Field(default=None, max_length=1000)
    category: str = Field(default="general", max_length=100)
    due_date: datetime = Field(..., description="Task due date in UTC")
    priority: TaskPriority = TaskPriority.MEDIUM
    dependencies: list[str] = Field(
        default_factory=list, description="IDs of tasks that must precede this task"
    )


class TaskCreate(TaskBase):
    """Payload to create a task."""

    pass


class TaskUpdate(BaseSchema):
    """Payload to update a task."""

    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    category: str | None = Field(default=None, max_length=100)
    due_date: datetime | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    dependencies: list[str] | None = None


class TaskResponse(TaskBase):
    """Public task representation."""

    id: str
    event_id: str
    user_id: str
    status: TaskStatus
    is_overdue: bool = False
    created_at: datetime
    updated_at: datetime


class RescheduleTimelineRequest(BaseSchema):
    """Request to adjust dates when event date changes."""

    new_event_date: datetime
    preserve_completed: bool = True


class TaskListResponse(BaseSchema):
    """Task list with progress overview and overdue statistics."""

    tasks: list[TaskResponse]
    total_tasks: int
    completed_tasks: int
    overdue_tasks: int
    completion_percentage: float
