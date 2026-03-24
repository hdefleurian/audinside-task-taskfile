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
docker compose up --build
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

### 3. Stop services

```bash
docker compose down          # Keep volumes (data preserved)
docker compose down -v       # Remove volumes (clean slate)
```

---

## Local Development (without Docker)

For a faster development loop you can run the frontend and backend directly on your machine while keeping PostgreSQL and Keycloak in Docker.

### Start only infrastructure

```bash
docker compose up postgres keycloak -d
```

### Backend

```bash
cd backend/src/TaskApi

# Restore dependencies
dotnet restore

# Apply database migrations
dotnet ef database update

# Run the API (hot-reload)
dotnet watch run
```

The API will be available at `http://localhost:5000`.

Environment variables are read from `appsettings.Development.json` which points to `localhost:5432` and `localhost:8080` by default.

### Frontend

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server with proxy
npm start
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
  "Auth": {
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

### Create a new migration

```bash
cd backend/src/TaskApi
dotnet ef migrations add <MigrationName>
```

### Apply migrations

```bash
# Against local database
dotnet ef database update

# Against Docker database (set connection string)
dotnet ef database update --connection "Host=localhost;Port=5432;Database=taskappdb;Username=taskapp;Password=taskapp_secret"
```

### Rollback a migration

```bash
dotnet ef database update <PreviousMigrationName>
dotnet ef migrations remove   # Remove the last unapplied migration
```

### View pending migrations

```bash
dotnet ef migrations list
```

In Development, the application automatically applies pending migrations at startup (`db.Database.MigrateAsync()`). In production, run migrations explicitly before deploying.

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

If the Keycloak volume is deleted, the realm will be re-imported automatically on the next `docker compose up`.

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
docker compose logs -f backend

# Connect directly to the database
docker compose exec postgres psql -U taskapp -d taskappdb
```

### Frontend

```bash
# Angular source maps are enabled in development
# Use browser dev tools → Sources for breakpoints

# View frontend container logs
docker compose logs -f frontend
```

### Keycloak

```bash
# View Keycloak logs
docker compose logs -f keycloak

# Export realm after manual changes
docker compose exec keycloak \
  /opt/keycloak/bin/kc.sh export \
  --dir /opt/keycloak/data/import \
  --realm taskapp
```

---

## Building for Production

### Backend

```bash
cd backend
docker build -t taskapp-backend .
```

The Dockerfile uses multi-stage build: SDK → publish → aspnet runtime image.

### Frontend

```bash
cd frontend
docker build -t taskapp-frontend .
```

The Dockerfile uses: node:22-alpine (build) → nginx:alpine (runtime).

### Full stack

```bash
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d
```

---

## Useful Commands Reference

```bash
# Rebuild only the backend image
docker compose up --build backend

# Run backend tests with coverage
dotnet test backend/tests/TaskApi.UnitTests --collect:"XPlat Code Coverage"

# Run frontend tests
cd frontend && npm test

# Run E2E tests (requires running stack)
cd frontend && npx playwright test

# Open Playwright report
npx playwright show-report

# Inspect EF model
cd backend/src/TaskApi && dotnet ef dbcontext info
```
