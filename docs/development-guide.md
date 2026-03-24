# Development Guide

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Docker Desktop | 4.x+ | Required for containers |
| Docker Compose | v2 | Bundled with Docker Desktop |
| .NET SDK | 10.0 | Backend development |
| Node.js | 22.x | Frontend development |
| Git | Latest | — |

---

## Getting Started

### 1. Clone and configure

```bash
git clone <repo-url>
cd audinside-task-taskfile
cp .env.example .env   # Review values — defaults work for local dev
```

### 2. Run with Docker Compose (recommended)

```bash
task compose:start
```

Services start in order: PostgreSQL → Keycloak → Backend → Frontend.

First startup takes longer because:
- PostgreSQL initialises its data directory
- Keycloak imports the realm
- .NET application images are built

Once running:
- Frontend: http://localhost:4200
- API docs: http://localhost:5000/scalar
- Keycloak admin: http://localhost:8080 (`admin` / `admin`)

In this mode, the backend runs in `Development` and applies pending EF Core migrations automatically on startup.

### 3. Stop services

```bash
task compose:stop:all        # Keep volumes (data preserved)
task compose:clean           # Remove volumes, images, and orphans
```

---

## Local Development (without Docker)

For a faster development loop you can run the frontend and backend directly on your machine while keeping PostgreSQL and Keycloak in Docker.

### Start only infrastructure

```bash
task compose:infra
```

### Backend

```bash
task build:backend
task -d backend tools:install
task db:migrate
task run:backend
```

The API will be available at `http://localhost:5000`.

Environment variables are read from `appsettings.Development.json` which points to `localhost:5432` and `localhost:8080` by default.

### Frontend

```bash
task init                      # first time only, Admin PowerShell
task -d frontend restore
task run:frontend
```

The app will be available at `http://localhost:4200`. API calls are proxied to `http://localhost:5000` via `proxy.conf.json`.

---

## Environment Variables

### Docker Compose (`.env` file)

```dotenv
# PostgreSQL
POSTGRES_DB=taskappdb
POSTGRES_USER=taskapp
POSTGRES_PASSWORD=taskapp_secret

# Keycloak
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

### Backend (`appsettings.Development.json`)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=taskappdb;Username=taskapp;Password=taskapp_secret"
  },
  "Keycloak": {
    "Authority": "http://localhost:8080/realms/taskapp",
    "Audience": "taskapp-backend"
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:4200"]
  }
}
```

### Frontend (`src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
  apiUrl: '/api',
  auth: {
    authority: 'http://localhost:8080/realms/taskapp',
    clientId: 'taskapp-frontend',
    redirectUrl: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    scope: 'openid profile email',
    responseType: 'code',
  }
};
```

---

## Database Migrations

The project uses EF Core code-first migrations.

### Migration ownership by environment

- `Development`: the application applies pending migrations on startup
- `Testing`: `TaskApiFactory` applies migrations explicitly when creating the test host
- `Production`: run migrations explicitly before or during deployment, not from app startup

This separation avoids conflicts between automatic startup migration and test-time schema creation.

### Create a new migration

```bash
task -d backend tools:install          # first time only
task db:migration:add NAME=<MigrationName>
```

### Apply migrations

```bash
# Start the Docker dependencies if needed
task compose:infra

# Apply migrations against the local development database
task db:migrate
```

### Rollback a migration

```bash
cd backend/src/TaskApi
dotnet ef database update <PreviousMigrationName> --project . --startup-project .
dotnet ef migrations remove --project . --startup-project .
```

### View pending migrations

```bash
task db:migration:list
```

If `dotnet-ef` is not found after installing it, add `%USERPROFILE%\\.dotnet\\tools` to your `PATH`.

---

## Keycloak Configuration

The Keycloak realm is pre-configured via `keycloak/realm-export.json` and imported on first start.

### Access Keycloak Admin Console

http://localhost:8080 → admin / admin → realm `taskapp`

### Add a new user manually

1. Open Admin Console → Users → Add user
2. Set username, enable user
3. Credentials tab → Set password (disable "Temporary")
4. Role mappings → Assign `user` and/or `admin` realm roles

### Re-import the realm

If the Keycloak volume is deleted, the realm will be re-imported automatically on the next `task compose:start`.

---

## Code Style & Conventions

### Backend (.NET)

- **Naming**: PascalCase for public members, `_camelCase` for private fields
- **Async**: All I/O operations are async (`Task`/`ValueTask`), method names suffixed `Async`
- **DTOs**: Separate request and response types; domain entities are never serialised directly
- **Validation**: Minimal API parameter binding handles basic validation; services enforce business rules
- **Null handling**: Nullable reference types enabled (`<Nullable>enable</Nullable>`)

### Frontend (Angular)

- **Components**: Standalone components only (no NgModules)
- **State**: Angular signals for local component state; `async` pipe for observables
- **HTTP**: All API calls go through `TaskService`; components never call `HttpClient` directly
- **Forms**: Reactive forms (`FormBuilder`) for all user inputs
- **Imports**: Feature-level imports at component level, not at app level

---

## Debugging

### Backend

Visual Studio / VS Code launch configuration uses `https` profile from `launchSettings.json`. The debugger attaches on port 5000.

```bash
# View backend logs in Docker
task compose:logs:backend

# Connect directly to the database
docker compose exec postgres psql -U taskapp -d taskappdb
```

### Frontend

```bash
# Angular source maps are enabled in development
# Use browser dev tools → Sources for breakpoints

# View frontend container logs
task compose:logs:frontend
```

### Keycloak

```bash
# View Keycloak logs
task compose:logs:keycloak

# Export realm after manual changes
task keycloak:export
```

---

## Building for Production

### Backend

```bash
task docker:build:backend
```

The Dockerfile uses multi-stage build: SDK → publish → aspnet runtime image.

### Frontend

```bash
task docker:build:frontend
```

The Dockerfile uses: node:22-alpine (build) → nginx:alpine (runtime).

### Full stack

```bash
task docker:build
task compose:start
```

---

## Useful Commands Reference

```bash
# Build everything
task build

# Start full stack or only local dependencies
task compose:start
task compose:infra

# Rebuild and restart a single Docker service
task compose:restart:backend
task compose:restart:frontend

# Start local backend workflow
task db:migrate && task run:backend

# Run focused test suites
task -d backend tests:unit
task -d backend tests:integration
task -d backend tests:coverage
task -d frontend tests
task -d frontend tests:coverage
task -d frontend tests:e2e

# Inspect migrations
task db:migration:list

# Open Playwright report
task -d frontend tests:e2e:report
```
