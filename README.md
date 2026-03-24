# TaskApp

A production-ready task management application built with Angular 19, .NET 10, PostgreSQL, and Keycloak. Fully containerised with Docker Compose.

---

## Features

- **Create, view, edit, and delete tasks** with title, description, status, priority, due date, and assignee
- **Authentication & authorisation** via Keycloak (OIDC / PKCE)
- **Paginated, filtered, and sorted** task list
- **Material Design** UI with Angular 19 standalone components
- **RESTful API** with Minimal APIs and OpenAPI / Scalar documentation
- **Fully containerised** — one command to run everything

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Docker Desktop | 4.x |
| Docker Compose | v2 |
| Node.js *(local dev only)* | 22.x |
| .NET SDK *(local dev only)* | 10.0 |

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd audinside-task-taskfile

# 2. Copy environment defaults
cp .env.example .env

# 3. Start the full stack
docker compose up --build

# 4. Open the app
#    Frontend  → http://localhost:4200
#    API docs  → http://localhost:5000/scalar
#    Keycloak  → http://localhost:8080  (admin / admin)
```

### Default test users (pre-configured in Keycloak)

| Username | Password | Roles |
|----------|----------|-------|
| `testuser` | `Test1234!` | user |
| `adminuser` | `Admin1234!` | user, admin |

---

## Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:4200 | Angular 19 SPA |
| Backend API | http://localhost:5000 | .NET 10 Minimal API |
| Keycloak | http://localhost:8080 | Identity provider |
| PostgreSQL | localhost:5432 | Database |

---

## Project Structure

```
.
├── backend/
│   ├── src/TaskApi/          # .NET 10 Minimal API
│   │   ├── Domain/           # Task entity
│   │   ├── Dtos/             # Request / response DTOs
│   │   ├── Endpoints/        # Minimal API route handlers
│   │   ├── Infrastructure/   # EF Core DbContext + migrations
│   │   └── Services/         # Business logic
│   ├── tests/
│   │   ├── TaskApi.UnitTests/        # xUnit + Moq
│   │   └── TaskApi.IntegrationTests/ # xUnit + Testcontainers
│   └── Dockerfile
├── frontend/
│   ├── src/app/
│   │   ├── auth/             # Keycloak OIDC service + guard + interceptor
│   │   └── tasks/            # Task model, service, and components
│   ├── e2e/                  # Playwright end-to-end tests
│   └── Dockerfile
├── keycloak/
│   └── realm-export.json     # Pre-configured realm
├── docs/
│   ├── architecture.md
│   ├── api-reference.md
│   ├── development-guide.md
│   └── testing-strategy.md
├── docker-compose.yml
├── docker-compose.override.yml
└── .env.example
```

---

## Common Commands

### Docker Compose

```bash
docker compose up --build          # Build and start all services
docker compose up -d               # Start in background
docker compose down                # Stop and remove containers
docker compose down -v             # Stop and remove containers + volumes
docker compose logs -f backend     # Stream backend logs
```

### Backend (.NET)

```bash
cd backend/src/TaskApi
dotnet run                          # Run API locally (requires local PostgreSQL)
dotnet test ../../tests/TaskApi.UnitTests
dotnet test ../../tests/TaskApi.IntegrationTests  # Requires Docker for Testcontainers
```

### EF Core Migrations

```bash
cd backend/src/TaskApi
dotnet ef migrations add <Name> --project . --startup-project .
dotnet ef database update
```

### Frontend (Angular)

```bash
cd frontend
npm install
npm start              # Dev server on http://localhost:4200
npm test               # Jest unit tests
npm run test:coverage  # Jest with coverage
npm run build:prod     # Production build
npx playwright install # Install E2E browsers (first time only)
npx playwright test    # Run E2E tests
```

---

## Environment Variables

See [`.env.example`](.env.example) for all configurable values. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `taskappdb` | Database name |
| `POSTGRES_USER` | `taskapp` | DB user |
| `POSTGRES_PASSWORD` | `taskapp_secret` | DB password |
| `KEYCLOAK_ADMIN` | `admin` | Keycloak admin user |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin` | Keycloak admin password |

---

## Documentation

- [Architecture Overview](docs/architecture.md)
- [API Reference](docs/api-reference.md)
- [Development Guide](docs/development-guide.md)
- [Testing Strategy](docs/testing-strategy.md)

---

## License

[MIT](LICENSE)
