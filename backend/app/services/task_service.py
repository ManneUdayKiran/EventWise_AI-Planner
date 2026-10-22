"""Task and planning timeline business service."""

from datetime import UTC, datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.errors import NotFoundError, ValidationError
from app.repositories.event_repo import EventRepository
from app.repositories.task_repo import TaskRepository
from app.schemas.task import (
    RescheduleTimelineRequest,
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskStatus,
    TaskUpdate,
)


class TaskService:
    """Service handling task creation, dependency management, overdue checks, and rescheduling."""

    def __init__(self, db: AsyncIOMotorDatabase | None = None):
        self.db = db
        self.task_repo = TaskRepository(db)
        self.event_repo = EventRepository(db)

    async def get_tasks(self, event_id: str, user_id: str) -> TaskListResponse:
        """Retrieve all planning tasks for an event with overdue and completion stats."""
        event = await self.event_repo.find_by_id_and_user(event_id, user_id)
        if not event:
            raise NotFoundError("Event not found or unauthorized.")

        raw_tasks = await self.task_repo.find_all_by_event(event_id, user_id)
        now = datetime.now(UTC)

        tasks_resp: list[TaskResponse] = []
        completed_count = 0
        overdue_count = 0

        for t in raw_tasks:
            due = t["due_date"]
            # Ensure timezone awareness
            if due.tzinfo is None:
                due = due.replace(tzinfo=UTC)

            is_completed = t.get("status") == TaskStatus.COMPLETED.value
            is_overdue = (due < now) and not is_completed

            if is_completed:
                completed_count += 1
            elif is_overdue:
                overdue_count += 1

            tasks_resp.append(
                TaskResponse(
                    id=t["id"],
                    event_id=t["event_id"],
                    user_id=t["user_id"],
                    title=t["title"],
                    description=t.get("description"),
                    category=t.get("category", "general"),
                    due_date=due,
                    priority=t.get("priority", "medium"),
                    status=t.get("status", TaskStatus.PENDING.value),
                    dependencies=t.get("dependencies", []),
                    is_overdue=is_overdue,
                    created_at=t["created_at"],
                    updated_at=t["updated_at"],
                )
            )

        total = len(tasks_resp)
        percentage = round((completed_count / total * 100), 1) if total > 0 else 0.0

        return TaskListResponse(
            tasks=tasks_resp,
            total_tasks=total,
            completed_tasks=completed_count,
            overdue_tasks=overdue_count,
            completion_percentage=percentage,
        )

    async def create_task(self, event_id: str, user_id: str, req: TaskCreate) -> TaskResponse:
        """Create a new task with dependency verification."""
        event = await self.event_repo.find_by_id_and_user(event_id, user_id)
        if not event:
            raise NotFoundError("Event not found or unauthorized.")

        # Ensure due_date is timezone aware
        due = req.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=UTC)

        data: dict[str, Any] = {
            "event_id": event_id,
            "user_id": user_id,
            "title": req.title.strip(),
            "description": req.description.strip() if req.description else None,
            "category": req.category.strip(),
            "due_date": due,
            "priority": str(getattr(req.priority, "value", req.priority)),
            "status": str(getattr(TaskStatus.PENDING, "value", "pending")),
            "dependencies": req.dependencies,
        }

        doc = await self.task_repo.insert(data)
        now = datetime.now(UTC)
        is_overdue = (due < now) and doc["status"] != TaskStatus.COMPLETED.value
        return TaskResponse(**doc, is_overdue=is_overdue)

    async def update_task(
        self, task_id: str, event_id: str, user_id: str, req: TaskUpdate
    ) -> TaskResponse:
        """Update an existing task."""
        existing = await self.task_repo.find_by_id_and_event(task_id, event_id, user_id)
        if not existing:
            raise NotFoundError("Task not found or unauthorized.")

        updates: dict[str, Any] = {}
        if req.title is not None:
            updates["title"] = req.title.strip()
        if req.description is not None:
            updates["description"] = req.description.strip() if req.description else None
        if req.category is not None:
            updates["category"] = req.category.strip()
        if req.due_date is not None:
            due = req.due_date
            if due.tzinfo is None:
                due = due.replace(tzinfo=UTC)
            updates["due_date"] = due
        if req.priority is not None:
            updates["priority"] = str(getattr(req.priority, "value", req.priority))
        if req.status is not None:
            # Check dependencies if trying to complete
            status_val = str(getattr(req.status, "value", req.status))
            if status_val == TaskStatus.COMPLETED.value and existing.get("dependencies"):
                # Ensure all dependency tasks are completed
                for dep_id in existing["dependencies"]:
                    dep_task = await self.task_repo.find_by_id_and_event(dep_id, event_id, user_id)
                    if dep_task and dep_task.get("status") != TaskStatus.COMPLETED.value:
                        raise ValidationError(
                            f"Cannot complete task: Dependent task '{dep_task.get('title')}' is not yet completed."
                        )
            updates["status"] = status_val
        if req.dependencies is not None:
            # Prevent self-dependency
            if task_id in req.dependencies:
                raise ValidationError("A task cannot depend on itself.")
            updates["dependencies"] = req.dependencies

        updated = await self.task_repo.update_by_id_and_event(task_id, event_id, user_id, updates)
        if not updated:
            raise NotFoundError("Task not found.")

        now = datetime.now(UTC)
        due = updated["due_date"]
        if due.tzinfo is None:
            due = due.replace(tzinfo=UTC)
        is_overdue = (due < now) and updated["status"] != TaskStatus.COMPLETED.value
        return TaskResponse(**updated, is_overdue=is_overdue)

    async def delete_task(self, task_id: str, event_id: str, user_id: str) -> bool:
        """Delete a task and remove it from dependencies in sibling tasks."""
        deleted = await self.task_repo.delete_by_id_and_event(task_id, event_id, user_id)
        if not deleted:
            raise NotFoundError("Task not found or unauthorized.")

        # Remove deleted task_id from other tasks' dependency lists if database connected
        if self.db is not None:
            await self.db.tasks.update_many(
                {"event_id": event_id, "dependencies": task_id},
                {"$pull": {"dependencies": task_id}},
            )
        return True

    async def reschedule_timeline(
        self, event_id: str, user_id: str, req: RescheduleTimelineRequest
    ) -> TaskListResponse:
        """Reschedule task dates when event date changes while preserving completed tasks."""
        event = await self.event_repo.find_by_id_and_user(event_id, user_id)
        if not event:
            raise NotFoundError("Event not found or unauthorized.")

        old_event_date = event["event_date"]
        if old_event_date.tzinfo is None:
            old_event_date = old_event_date.replace(tzinfo=UTC)

        new_event_date = req.new_event_date
        if new_event_date.tzinfo is None:
            new_event_date = new_event_date.replace(tzinfo=UTC)

        time_delta = new_event_date - old_event_date

        tasks = await self.task_repo.find_all_by_event(event_id, user_id)
        for t in tasks:
            is_completed = t.get("status") == TaskStatus.COMPLETED.value
            # Business rule: preserve completed tasks unless instructed otherwise
            if req.preserve_completed and is_completed:
                continue

            old_due = t["due_date"]
            if old_due.tzinfo is None:
                old_due = old_due.replace(tzinfo=UTC)

            new_due = old_due + time_delta
            await self.task_repo.update_by_id_and_event(
                t["id"], event_id, user_id, {"due_date": new_due}
            )

        # Update event's event_date
        await self.event_repo.update_by_id_and_user(
            event_id, user_id, {"event_date": new_event_date}
        )

        return await self.get_tasks(event_id, user_id)
