# Audinsine Task #1 2026 - Demo Taskfile

This repository contains a task management application built with Angular 19, .NET 10, PostgreSQL, and Keycloak. The application is also fully containerised with Docker Compose.
It illustrates usages of [Task](https://taskfile.dev) tool.

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
task compose:start

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

### Workspace Tasks

```bash
task build                                      # Build backend + frontend
task tests                                      # Run backend + frontend tests
task compose:start                              # Start full Docker Compose stack
task compose:infra                              # Start postgres + keycloak only
task compose:logs:backend                       # Follow backend logs
task compose:stop:all                           # Stop all services
task run:backend                                # Run backend locally
task run:frontend                               # Run frontend locally
task db:migration:list                          # Show pending/applied migrations
task db:migrate                                 # Apply migrations to local DB
task db:migration:add NAME=AddSomeFeature       # Create a new migration
task -d backend tests:unit                      # Run backend unit tests only
task -d backend tests:integration               # Run backend integration tests only
task -d frontend tests                          # Run frontend unit tests
task -d frontend tests:coverage                 # Run frontend tests with coverage
task -d frontend tests:e2e                      # Run Playwright E2E tests
```

### One-time Setup

```bash
task init                                       # Enable pnpm via corepack (Admin PowerShell)
task -d backend tools:install                   # Install dotnet-ef
```

### Migration ownership

- `task compose:start` in local development: the backend container applies pending migrations on startup
- `task db:migrate`: explicit local migration path when running the backend outside Docker
- integration tests: the test host applies migrations against the fresh PostgreSQL test container before requests are executed
- production: run migrations as an explicit deployment step rather than on app startup

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
