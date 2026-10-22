# EventWise AI - Testing Strategy & Verification Report

## 1. Testing Philosophy

EventWise AI enforces a multi-layered verification strategy covering:
1. **Unit Tests**: Deterministic math, financial rounding, date logic, task dependencies, schema validation, and fallback generation.
2. **Integration Tests**: End-to-end API workflows with an isolated MongoDB database.
3. **Security Tests**: BOLA/IDOR prevention, unauthorized token handling, password hashing, and payload boundary checks.
4. **Resilience & Performance Tests**: AI timeout handling, rate limit recovery, concurrent API latency under load.
5. **Frontend & Accessibility Checks**: Component rendering, keyboard navigation, aria labels, and form validation.

---

## 2. Test Execution Commands

### Backend Tests
From the `Eventwise_AI/backend` directory:
```bash
# Run all unit and integration tests
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=term-missing

# Run security test suite specifically
pytest tests/security/ -v

# Run performance and resilience tests
pytest tests/performance/ -v
```

### Static Analysis & Linting
```bash
# Backend linting and formatting check
ruff check .
ruff format --check .

# Frontend linting and typecheck
npm run lint
npm run typecheck
```

### Frontend Tests
From the `Eventwise_AI/frontend` directory:
```bash
# Run Vitest unit & component tests
npm run test

# Run with coverage
npm run test:coverage
```

---

## 3. Test Suites Overview

| Suite | Focus | Key Scenarios |
|---|---|---|
| `tests/unit/test_budget_service.py` | Math & Rounding | Zero budget, zero guests, overspending detection, negative expense rejection |
| `tests/unit/test_task_service.py` | Timeline & Dates | Overdue calculation, dependency resolution, date recalculation preserving completed tasks |
| `tests/unit/test_ai_validation.py` | AI Resilience | Pydantic schema validation, missing fields, malformed JSON repair, deterministic fallback |
| `tests/integration/test_auth_api.py` | Auth Flow | User registration, login, JWT issuance, profile retrieval |
| `tests/integration/test_events_api.py` | Event CRUD | Create, get, list, update, cascade delete with MongoDB |
| `tests/integration/test_budget_api.py` | Budget Endpoints | Add, update, delete budget items, calculate balances |
| `tests/integration/test_assistant_api.py` | AI Assistant Flow | Targeted proposal generation, user confirmation, delta persistence |
| `tests/security/test_cross_user_access.py` | BOLA/IDOR | Cross-tenant event access blocked (returns 404/403) |
| `tests/security/test_security_auth.py` | Auth Security | Expired token, invalid signature, weak password rejection |
### Phase 3 Verified Test Results (Core Event Management)

- **Total Backend Tests Passing**: **36 / 36** in 5.27s
- **All Ruff Checks**: **Passed with 0 errors**
- **All Frontend Tests Passing**: **3 / 3** in 931ms
- **Production Build**: **Completed in 821ms**

#### Added Suites in Phase 3:
1. `tests/unit/test_budget_service.py` (4 tests):
   - `test_budget_calculations_deterministic`: PASSED
   - `test_zero_budget_and_zero_guests_safety`: PASSED
   - `test_overspending_detection`: PASSED
   - `test_negative_budget_amount_rejected`: PASSED
2. `tests/unit/test_task_service.py` (3 tests):
   - `test_overdue_task_detection`: PASSED
   - `test_task_dependency_enforcement`: PASSED
   - `test_reschedule_preserves_completed_tasks`: PASSED
3. `tests/unit/test_vendor_service.py` (2 tests):
   - `test_vendor_category_and_quotation_calculations`: PASSED
   - `test_negative_quotation_rejected`: PASSED
4. `tests/unit/test_event_service.py` (3 tests):
   - `test_event_types_creation_success` (Weddings, Birthdays, Community Events): PASSED
   - `test_negative_event_budget_rejected`: PASSED
   - `test_cross_user_event_access_rejected`: PASSED
5. `tests/integration/test_events_api.py` (1 test):
   - `test_event_crud_lifecycle`: PASSED (Creation, detail with summary, update, cascade delete)
6. `tests/integration/test_budget_api.py` (1 test):
   - `test_budget_api_endpoints`: PASSED (Add items, summary calculation, update actuals, delete)
7. `tests/integration/test_tasks_api.py` (1 test):
   - `test_tasks_api_lifecycle`: PASSED (Add tasks, dependencies, completion, rescheduling)
8. `tests/integration/test_vendors_api.py` (1 test):
   - `test_vendors_api_lifecycle`: PASSED (Add vendor, booking status update, deletion)
9. `tests/security/test_cross_user_access.py` (1 test):
   - `test_cross_user_access_blocked`: PASSED (9 multi-tenant barrier assertions for Events, Budget, Tasks, Vendors)


### Frontend Suite (`vitest run`)
- Total test files: **3**
- Total tests executed: **7**
- Result: **7 passed, 0 failed** in 4.32s
- Covered scenarios:
  - `App.test.tsx`:
    - `renders navbar with brand title`: PASSED
    - `renders call to action buttons on landing page`: PASSED
    - `renders supported event types`: PASSED
  - `Dashboard.test.tsx`:
    - `renders dashboard header banner and aggregate metrics`: PASSED
    - `renders filter tabs and event cards with metadata`: PASSED
    - `renders empty state when user has no events`: PASSED
  - `EventWorkspace.test.tsx`:
    - `renders event header, tabs, and overview metrics`: PASSED
- Production bundle: **Vite build completed in 1.51s** with optimized vendor chunks (`vendor-mui`, `vendor-react`, `vendor`).

### Static Analysis
- Ruff check & format: **Passed with 0 errors**.

