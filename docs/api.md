# EventWise AI - REST API Specifications

Base URL: `/api/v1`

All protected endpoints require an `Authorization: Bearer <JWT>` header.

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /auth/register`
Register a new user account.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "full_name": "Jane Planner"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "6714...",
      "email": "user@example.com",
      "full_name": "Jane Planner"
    }
  }
  ```
- **Errors**: `400 Bad Request` (Email already registered, weak password), `422 Unprocessable Entity`.

### `POST /auth/login`
Authenticate user credentials and receive access token.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "6714...",
      "email": "user@example.com",
      "full_name": "Jane Planner"
    }
  }
  ```
- **Errors**: `401 Unauthorized` (Invalid credentials).

### `GET /auth/me`
Retrieve profile of currently authenticated user.
- **Response**: `200 OK`
  ```json
  {
    "id": "6714...",
    "email": "user@example.com",
    "full_name": "Jane Planner"
  }
  ```

---

## 2. Event Management Endpoints (`/api/v1/events`)

### `POST /events`
Create a new event.
- **Request Body**:
  ```json
  {
    "name": "Sarah & Alex's Wedding",
    "event_type": "wedding",
    "event_date": "2026-12-15T16:00:00Z",
    "location": "Green Valley Gardens",
    "expected_guest_count": 120,
    "total_budget": 500000.0,
    "currency": "INR",
    "theme": "Rustic Garden",
    "preferences": "Eco-friendly, live band",
    "special_requirements": "Wheelchair accessible"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "id": "6715...",
    "user_id": "6714...",
    "name": "Sarah & Alex's Wedding",
    "event_type": "wedding",
    "event_date": "2026-12-15T16:00:00Z",
    "location": "Green Valley Gardens",
    "expected_guest_count": 120,
    "total_budget": 500000.0,
    "currency": "INR",
    "theme": "Rustic Garden",
    "preferences": "Eco-friendly, live band",
    "special_requirements": "Wheelchair accessible",
    "status": "planning",
    "created_at": "2026-10-20T10:00:00Z",
    "updated_at": "2026-10-20T10:00:00Z"
  }
  ```

### `GET /events`
List all events owned by the authenticated user.
- **Response**: `200 OK` - Array of Event objects with summary progress statistics.

### `GET /events/{id}`
Retrieve event details, verifying owner authorization.
- **Response**: `200 OK` - Event object with progress summary.
- **Errors**: `404 Not Found` (Event not found or does not belong to user).

### `PUT /events/{id}`
Update event details.
- **Request Body**: Partial or full Event fields.
- **Response**: `200 OK` - Updated Event object.

### `DELETE /events/{id}`
Delete event and its associated budget items, tasks, and vendor entries.
- **Response**: `200 OK` `{"message": "Event deleted successfully"}`.

---

## 3. Budget Management Endpoints (`/api/v1/events/{event_id}/budget`)

### `GET /events/{event_id}/budget`
Retrieve budget summary (total planned, allocated, estimated, actual, remaining, utilization rate, cost per guest) and category item breakdown.
- **Response**: `200 OK`
  ```json
  {
    "total_budget": 500000.0,
    "currency": "INR",
    "total_estimated": 450000.0,
    "total_actual": 380000.0,
    "remaining_budget": 120000.0,
    "cost_per_guest": 3166.67,
    "utilization_percentage": 76.0,
    "is_overspent": false,
    "overspent_amount": 0.0,
    "items_by_category": { ... },
    "items": [ ... ]
  }
  ```

### `POST /events/{event_id}/budget`
Add a budget item.
- **Request Body**:
  ```json
  {
    "category": "catering",
    "item_name": "Appetizers and Mocktails",
    "estimated_amount": 35000.0,
    "actual_amount": 32000.0,
    "notes": "Includes glass dispensers"
  }
  ```
- **Response**: `201 Created`

### `PUT /events/{event_id}/budget/{item_id}`
Update an existing budget item.

### `DELETE /events/{event_id}/budget/{item_id}`
Remove a budget item.

---

## 4. Timeline & Task Endpoints (`/api/v1/events/{event_id}/tasks`)

### `GET /events/{event_id}/tasks`
List all planning tasks for the event, sorted by due date.
- **Response**: `200 OK` with list of tasks, overdue status, and completion progress.

### `POST /events/{event_id}/tasks`
Create a task.
- **Request Body**:
  ```json
  {
    "title": "Select Floral Arrangements",
    "description": "Meet with florist to confirm centerpieces",
    "category": "decoration",
    "due_date": "2026-11-20T17:00:00Z",
    "priority": "medium",
    "dependencies": []
  }
  ```

### `PUT /events/{event_id}/tasks/{task_id}`
Update task details or status (`pending`, `in_progress`, `completed`).

### `DELETE /events/{event_id}/tasks/{task_id}`
Delete task.

### `POST /events/{event_id}/tasks/reschedule`
Recalculate due dates based on a new event date while preserving completed tasks.

---

## 5. Vendor Checklist Endpoints (`/api/v1/events/{event_id}/vendors`)

### `GET /events/{event_id}/vendors`
Retrieve vendor checklist items grouped by 8 primary categories.

### `POST /events/{event_id}/vendors`
Add a vendor checklist item with quotation, booking status, and payment tracking.

### `PUT /events/{event_id}/vendors/{item_id}`
Update vendor checklist item.

### `DELETE /events/{event_id}/vendors/{item_id}`
Delete vendor checklist item.

---

## 6. AI Plan Generation & Assistant Endpoints (`/api/v1/events/{event_id}/ai`)

### `POST /events/{event_id}/ai/generate-plan`
Generate a full, structured event plan (summary, themes, food, entertainment, budget allocations, initial tasks, and vendor checklist).
- **Request Body**: Optional custom focus preferences.
- **Response**: `200 OK` with validated plan proposal.
- **Query / Header Options**: Automatically uses configured provider or offline high-fidelity sample mode.

### `POST /events/{event_id}/ai/apply-plan`
Apply the validated AI-generated plan to populate the event's budget items, tasks, and vendor checklist.

### `POST /events/{event_id}/ai/assistant`
Submit a targeted natural language change request (e.g. "Reduce my budget by ₹10,000", "Suggest a vegetarian menu for 60 guests").
- **Request Body**:
  ```json
  {
    "prompt": "Reduce decoration budget by 10000 and add a task to rent fairy lights"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "proposal_id": "6716...",
    "explanation": "I have created a proposal to reduce the decoration allocation by ₹10,000 and added a task to rent fairy lights by Nov 15th.",
    "proposed_changes": {
      "budget_adjustments": [...],
      "task_additions": [...]
    },
    "requires_confirmation": true
  }
  ```

### `POST /events/{event_id}/ai/assistant/{proposal_id}/confirm`
Confirm and persist the proposed targeted changes.
- **Response**: `200 OK` with details of persisted deltas.
