# Testing Strategy

## Overview

TaskApp follows the **test pyramid**: many fast unit tests at the base, fewer integration tests in the middle, and a small number of end-to-end tests at the top.

```
          /\
         /  \
        / E2E \          ← 14 tests (Playwright)
       /────────\
      / Integration \    ← 9 tests  (Testcontainers + WebApplicationFactory)
     /──────────────\
    /   Unit Tests   \   ← 12 backend + 38 frontend tests
   /──────────────────\
```

---

## Backend Tests (.NET / xUnit)

### Unit Tests — `TaskApi.UnitTests`

**Location:** `backend/tests/TaskApi.UnitTests/`

**Tooling:**
- [xUnit](https://xunit.net/) — test runner
- [FluentAssertions](https://fluentassertions.com/) — assertion library
- EF Core **in-memory** provider — database substitute (no mocking needed)

**What is tested:**

`TaskServiceTests` covers the complete `TaskService` business logic:

| Test | Description |
|------|-------------|
| `GetAllAsync_ReturnsPaged_WithPagination` | Verifies skip/take pagination |
| `GetAllAsync_FiltersBy_Status` | Status filter returns only matching tasks |
| `GetAllAsync_FiltersBy_Priority` | Priority filter returns only matching tasks |
| `GetAllAsync_FiltersBy_SearchTerm` | Full-text search on title/description |
| `GetByIdAsync_ReturnsTask_WhenExists` | Returns correct task by ID |
| `GetByIdAsync_ReturnsNull_WhenNotFound` | Returns null for unknown ID |
| `CreateAsync_Persists_Task` | Task is saved to DB |
| `CreateAsync_SetsDefaults` | `Id`, `CreatedAt`, `UpdatedAt` are set |
| `UpdateAsync_Updates_ExistingTask` | Fields are updated |
| `UpdateAsync_ReturnsNull_WhenNotFound` | Returns null for unknown ID |
| `DeleteAsync_Removes_Task` | Task is removed from DB |
| `DeleteAsync_ReturnsFalse_WhenNotFound` | Returns false for unknown ID |

**Run:**

```bash
task -d backend tests:unit
```

**Design principles:**
- Each test creates a fresh in-memory database: `UseInMemoryDatabase(Guid.NewGuid().ToString())`
- Tests are self-contained and order-independent
- Each test follows **Arrange → Act → Assert**

---

### Integration Tests — `TaskApi.IntegrationTests`

**Location:** `backend/tests/TaskApi.IntegrationTests/`

**Tooling:**
- [xUnit](https://xunit.net/)
- [FluentAssertions](https://fluentassertions.com/)
- [Testcontainers.PostgreSql](https://dotnet.testcontainers.org/) — real PostgreSQL in Docker
- `Microsoft.AspNetCore.Mvc.Testing` — `WebApplicationFactory<Program>`

**Infrastructure:**

`TaskApiFactory` spins up a real PostgreSQL container and boots the full ASP.NET Core pipeline:

```csharp
WebApplicationFactory<Program> + IAsyncLifetime
  → PostgreSqlBuilder().WithImage("postgres:16-alpine")
  → Replaces DbContext connection string with container connection string
  → Replaces authentication with a test-only bearer handler
  → Creates the host in `Testing`
  → db.Database.Migrate()
```

**What is tested (`TaskEndpointsTests`):**

| Test | HTTP | Expected |
|------|------|----------|
| `GetTasks_ReturnsOk_WithEmptyList` | GET /api/tasks | 200 + empty items |
| `CreateTask_ReturnsCreated_WithTask` | POST /api/tasks | 201 + task body |
| `GetTask_ReturnsOk_WhenExists` | GET /api/tasks/{id} | 200 + task |
| `GetTask_ReturnsNotFound_WhenMissing` | GET /api/tasks/{guid} | 404 |
| `UpdateTask_ReturnsOk_WithUpdatedTask` | PUT /api/tasks/{id} | 200 + updated task |
| `UpdateTask_ReturnsNotFound_WhenMissing` | PUT /api/tasks/{guid} | 404 |
| `DeleteTask_ReturnsNoContent_WhenDeleted` | DELETE /api/tasks/{id} | 204 |
| `DeleteTask_ReturnsNotFound_WhenMissing` | DELETE /api/tasks/{guid} | 404 |
| `GetTasks_ReturnsUnauthorized_WithoutToken` | GET /api/tasks (no auth) | 401 |

**Run:**

```bash
# Requires Docker to be running (Testcontainers starts PostgreSQL automatically)
task -d backend tests:integration
```

**JWT bypass for testing:**

Integration tests do not call Keycloak. `TaskApiFactory` swaps the default authentication scheme for a test-only handler that accepts any request carrying an `Authorization: Bearer ...` header.

**Migration timing in tests:**

- The application no longer owns migration startup in the `Testing` environment
- `TaskApiFactory` applies migrations explicitly after creating the test host
- This avoids conflicts such as creating tables twice before endpoint tests begin

---

## Frontend Tests (Jest)

**Location:** `frontend/src/app/`

**Tooling:**
- [Jest](https://jestjs.io/) v29
- [jest-preset-angular](https://thymikee.github.io/jest-preset-angular/) — Angular test setup
- `HttpClientTestingModule` / `HttpTestingController` — HTTP mocking

**What is tested (`task.service.spec.ts`):**

**`task.service.spec.ts`** — HTTP layer:

| Test | Description |
|------|-------------|
| `getTasks should GET /api/tasks` | Correct URL and method |
| `getTasks should pass query params` | Status, page, pageSize in params |
| `getTasks should not include undefined params` | No empty params |
| `getTask should GET /api/tasks/{id}` | Correct URL |
| `createTask should POST with body` | Method, URL, body |
| `updateTask should PUT with partial update` | Method, URL, body |
| `deleteTask should DELETE` | Method and URL |

**`task-list.component.spec.ts`** — list view logic:

| Test | Description |
|------|-------------|
| `should create` | Component initialises |
| `should call getTasks on init` | loadTasks invoked on ngOnInit |
| `should render tasks when loaded` | tasks signal and totalCount updated |
| `should show snackbar error when getTasks fails` | error path handled |
| `onSearch() should reset page to 0 and reload` | pagination reset on search |
| `onFilterChange() should reset page to 0 and reload` | pagination reset on filter |
| `clearFilters() should clear all filter signals and reload` | all signals reset |
| `deleteTask() should open confirm dialog` | MatDialog opened |
| `deleteTask() should call deleteTask service when confirmed` | deletion on confirm |
| `deleteTask() should NOT call deleteTask service when cancelled` | no-op on cancel |

**`task-detail.component.spec.ts`** — detail view logic:

| Test | Description |
|------|-------------|
| `should create` | Component initialises |
| `should load and display task on init` | getTask called, task signal set |
| `should show snackbar and navigate to list on load error` | error path handled |
| `deleteTask() should open confirm dialog` | MatDialog opened |
| `deleteTask() should delete and navigate when confirmed` | deletion on confirm |
| `deleteTask() should NOT delete when cancelled` | no-op on cancel |
| `deleteTask() should do nothing when task is null` | null guard |

**`task-form.component.spec.ts`** — create & edit form:

| Test | Description |
|------|-------------|
| `should create` | Component initialises |
| `should be in create mode when no route id` | isEdit false without id |
| `should have form invalid when title is empty` | required validator |
| `should have form valid with a title` | valid state |
| `should call createTask on valid submit` | POST on creation |
| `should not call createTask when form is invalid` | guard on invalid |
| `should show error snackbar when createTask fails` | error UI feedback |
| `should enforce maxLength(200) on title` | length validator |
| `should be in edit mode when route id is present` | isEdit true with id |
| `should load and pre-fill the form with existing task data` | patchValue on load |
| `should call updateTask on valid submit in edit mode` | PUT on edit |

**`auth.service.spec.ts`** — auth service delegation:

| Test | Description |
|------|-------------|
| `should expose isAuthenticated$ mapping to boolean` | observable mapped |
| `should call oidc.authorize() when login() is invoked` | login delegates |
| `should call oidc.logoff() when logout() is invoked` | logout delegates |
| `should return access token from getAccessToken()` | token forwarded |

**`auth.guard.spec.ts`** — route guard:

| Test | Description |
|------|-------------|
| `should return true when authenticated` | allows navigation |
| `should return false and call login() when not authenticated` | redirects to login |

**`auth.interceptor.spec.ts`** — HTTP interceptor:

| Test | Description |
|------|-------------|
| `should attach Authorization header for /api/ requests` | header added |
| `should call getAccessToken for /api/ requests` | token retrieved |

**Run:**

```bash
task -d frontend tests
task -d frontend tests:watch
task -d frontend tests:coverage
```

**Coverage report:** `frontend/coverage/`

---

## End-to-End Tests (Playwright)

**Location:** `frontend/e2e/`

**Tooling:**
- [Playwright](https://playwright.dev/) v1.49
- Browser: Chromium (default), configurable via `playwright.config.ts`

**Prerequisites:**

A running Docker Compose stack with all services:

```bash
task compose:start
task init                 # First time only, Admin PowerShell
task -d frontend restore
```

**Test suites:**

### Authentication

| Test | Description |
|------|-------------|
| Redirect to Keycloak | Unauthenticated visit to `/tasks` triggers Keycloak redirect |
| Successful login | User logs in with test credentials, sees toolbar |

### Task Management

| Test | Description |
|------|-------------|
| Task list loads | `/tasks` shows the task list heading |
| Create task | Fill form, save, task appears in list |
| View task detail | Click task → detail page shows correct title |
| Edit task | Edit task → update title → changes reflected |
| Delete task | Delete from detail → task absent from list |

### Filtering and Sorting

| Test | Description |
|------|-------------|
| Search filters by title | Unique title returns exactly one row |
| Status dropdown filters list | Only matching status rows shown |
| Priority dropdown filters list | Only matching priority rows shown |
| Clear filters resets list | Row count returns to unfiltered state |
| Title column sort | Clicking header changes sort order |
| Paginator is present | Mat-paginator visible with total count |

**Run:**

```bash
task -d frontend tests:e2e
task -d frontend tests:e2e:report
task -d frontend tests:e2e:headed   # headed browser (debugging)
task -d frontend tests:e2e:ui       # Playwright UI mode
```

**Configuration:** `frontend/playwright.config.ts`

---

## Running All Tests

```bash
# Backend unit + integration tests
task -d backend tests:unit
task -d backend tests:integration

# Frontend unit tests
task -d frontend tests

# E2E (requires running stack)
task compose:start
task -d frontend tests:e2e
```

---

## Continuous Integration Recommendations

For a CI pipeline (e.g. GitHub Actions):

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with: { dotnet-version: '10.0.x' }

      - name: Backend tests
        run: |
          dotnet test backend/tests/TaskApi.UnitTests
          dotnet test backend/tests/TaskApi.IntegrationTests
          # Testcontainers will pull postgres:16-alpine automatically

      - name: Setup Node
        uses: actions/setup-node@v4
        with: { node-version: '22' }

      - name: Frontend tests
        run: |
          cd frontend
          corepack enable
          pnpm install --frozen-lockfile
          pnpm test -- --ci

      - name: E2E tests
        run: |
          docker compose up -d
          docker compose wait  # Or use healthcheck polling
          cd frontend
          pnpm exec playwright install --with-deps
          pnpm exec playwright test
```

---

## Coverage Targets

| Layer | Tool | Target |
|-------|------|--------|
| Backend services | Coverlet | ≥ 80% line coverage |
| Frontend services | Jest | ≥ 80% statement coverage |
| API endpoints | Integration tests | All 5 endpoints × all status codes |
| Critical user flows | Playwright | Login, CRUD, delete |
