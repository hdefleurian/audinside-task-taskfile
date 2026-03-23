# Testing Strategy

## Overview

TaskApp follows the **test pyramid**: many fast unit tests at the base, fewer integration tests in the middle, and a small number of end-to-end tests at the top.

```
          /\
         /  \
        / E2E \          ← 9 tests  (Playwright)
       /────────\
      / Integration \    ← 9 tests  (Testcontainers + WebApplicationFactory)
     /──────────────\
    /   Unit Tests   \   ← 12 backend + 8 frontend tests
   /──────────────────\
```

---

## Backend Tests (.NET / xUnit)

### Unit Tests — `TaskApi.UnitTests`

**Location:** `backend/tests/TaskApi.UnitTests/`

**Tooling:**
- [xUnit](https://xunit.net/) — test runner
- [Moq](https://github.com/devlooped/moq) — mocking
- [FluentAssertions](https://fluentassertions.com/) — assertion library
- EF Core **in-memory** provider — database substitute

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
dotnet test backend/tests/TaskApi.UnitTests
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
  → PostConfigure<JwtBearerOptions> bypasses JWT signature validation in Testing env
  → db.Database.EnsureCreated()
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
dotnet test backend/tests/TaskApi.IntegrationTests
```

**JWT bypass for testing:**

Integration tests generate unsigned JWT tokens using a `SignatureValidator` passthrough registered via `PostConfigure<JwtBearerOptions>`. This means tests run without a live Keycloak instance.

---

## Frontend Tests (Jest)

**Location:** `frontend/src/app/`

**Tooling:**
- [Jest](https://jestjs.io/) v29
- [jest-preset-angular](https://thymikee.github.io/jest-preset-angular/) — Angular test setup
- `HttpClientTestingModule` / `HttpTestingController` — HTTP mocking

**What is tested (`task.service.spec.ts`):**

| Test | Description |
|------|-------------|
| `getTasks should GET /api/tasks` | Correct URL and method |
| `getTasks should pass query params` | Status, page, pageSize in params |
| `getTasks should not include undefined params` | No empty params |
| `getTask should GET /api/tasks/{id}` | Correct URL |
| `createTask should POST with body` | Method, URL, body |
| `updateTask should PUT with partial update` | Method, URL, body |
| `deleteTask should DELETE` | Method and URL |

**Run:**

```bash
cd frontend
npm test                   # Run once
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
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
docker compose up -d
npx playwright install    # First time only
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

**Run:**

```bash
cd frontend
npx playwright test               # All tests, headless
npx playwright test --headed      # Watch browser
npx playwright test --ui          # Playwright UI mode
npx playwright show-report        # Open last HTML report
```

**Configuration:** `frontend/playwright.config.ts`

---

## Running All Tests

```bash
# Backend unit + integration tests
dotnet test backend/tests/TaskApi.UnitTests
dotnet test backend/tests/TaskApi.IntegrationTests

# Frontend unit tests
cd frontend && npm test

# E2E (requires running stack)
cd frontend && npx playwright test
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
          npm ci
          npm test -- --ci

      - name: E2E tests
        run: |
          docker compose up -d
          docker compose wait  # Or use healthcheck polling
          cd frontend
          npx playwright install --with-deps
          npx playwright test
```

---

## Coverage Targets

| Layer | Tool | Target |
|-------|------|--------|
| Backend services | Coverlet | ≥ 80% line coverage |
| Frontend services | Jest | ≥ 80% statement coverage |
| API endpoints | Integration tests | All 5 endpoints × all status codes |
| Critical user flows | Playwright | Login, CRUD, delete |
