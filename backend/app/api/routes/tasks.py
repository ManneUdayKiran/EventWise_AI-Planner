"""Timeline and Task management API routes."""

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_database
from app.schemas.task import (
    RescheduleTimelineRequest,
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
)
from app.schemas.user import UserResponse
from app.services.task_service import TaskService

router = APIRouter(prefix="/events/{event_id}/tasks", tags=["Tasks & Timeline"])


@router.get(
    "",
    response_model=TaskListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all planning tasks for an event",
)
async def list_tasks(
    event_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> TaskListResponse:
    """Retrieve all planning tasks with completion and overdue indicators."""
    service = TaskService(db)
    return await service.get_tasks(event_id, current_user.id)


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a planning task",
)
async def create_task(
    event_id: str,
    req: TaskCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> TaskResponse:
    """Create a task with priority, category, and optional dependencies."""
    service = TaskService(db)
    return await service.create_task(event_id, current_user.id, req)


@router.put(
    "/{task_id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Update task details or status",
)
async def update_task(
    event_id: str,
    task_id: str,
    req: TaskUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> TaskResponse:
    """Update task fields or transition status (pending, in_progress, completed)."""
    service = TaskService(db)
    return await service.update_task(task_id, event_id, current_user.id, req)


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a task",
)
async def delete_task(
    event_id: str,
    task_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Delete a task and clean dependencies from other tasks."""
    service = TaskService(db)
    await service.delete_task(task_id, event_id, current_user.id)
    return {"message": "Task deleted successfully."}


@router.post(
    "/reschedule",
    response_model=TaskListResponse,
    status_code=status.HTTP_200_OK,
    summary="Reschedule timeline when event date changes",
)
async def reschedule_timeline(
    event_id: str,
    req: RescheduleTimelineRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> TaskListResponse:
    """Recalculate due dates for tasks based on new event date, preserving completed tasks."""
    service = TaskService(db)
    return await service.reschedule_timeline(event_id, current_user.id, req)
