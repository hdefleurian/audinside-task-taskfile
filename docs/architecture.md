# Architecture Overview

## System Context

TaskApp is a multi-tier web application composed of four containerised services that communicate over an isolated Docker bridge network.

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Angular 19 SPA  (http://localhost:4200)                  │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
└────────────────────────────│────────────────────────────────────┘
                             │ HTTP / OIDC
        ┌────────────────────┼───────────────────────┐
        ▼                    ▼                        │
  ┌──────────┐        ┌────────────┐                  │
  │ Keycloak │        │ .NET 10    │                  │
  │ :8080    │        │ Minimal API│                  │
  │          │        │ :8080      │                  │
  └──────────┘        └─────┬──────┘                  │
   Identity                 │ EF Core / Npgsql         │
   Provider                 ▼                          │
                     ┌────────────┐                    │
                     │ PostgreSQL │                    │
                     │ :5432      │                    │
                     └────────────┘                    │
                                                       │
        ─────────────── Docker network ────────────────┘
                       taskapp-network
```

---

## Component Descriptions

### Frontend — Angular 19

| Concern | Implementation |
|---------|---------------|
| Framework | Angular 19 standalone components |
| UI library | Angular Material 19 |
| Authentication | `angular-auth-oidc-client` (OIDC Authorization Code + PKCE) |
| HTTP | `HttpClient` with `authInterceptor` (attaches Bearer token) |
| Routing | Lazy-loaded routes protected by `authGuard` |
| Build output | Served by Nginx from `nginx:alpine` container |
| Unit tests | Jest + jest-preset-angular |
| E2E tests | Playwright |

**Key directories:**

```
src/
  app/
    auth/           # OidcSecurityService wrapper, guard, interceptor
    tasks/          # TaskItem model, TaskService, 3 feature components
  environments/     # environment.ts (dev) / environment.prod.ts
```

**Authentication flow:**

1. User visits a protected route (`/tasks/**`)
2. `authGuard` checks `OidcSecurityService.isAuthenticated$`
3. If not authenticated → `authorize()` redirects to Keycloak
4. Keycloak redirects back with auth code
5. Angular exchanges code for tokens (PKCE)
6. `authInterceptor` attaches `Authorization: Bearer <token>` to all `/api/` requests

---

### Backend — .NET 10 Minimal API

| Concern | Implementation |
|---------|---------------|
| Framework | ASP.NET Core 10, Minimal APIs |
| ORM | Entity Framework Core 10 + Npgsql |
| Authentication | JWT Bearer (`Microsoft.AspNetCore.Authentication.JwtBearer`) |
| Token validation | Keycloak JWKS endpoint (authority auto-discovery) |
| API docs | OpenAPI + Scalar |
| Health checks | `/health` via `AddDbContextCheck<AppDbContext>` |
| Migrations | Code-first, auto-applied in Development |

**Layer structure:**

```
TaskApi/
  Domain/         # TaskItem entity (Guid PK, enums as strings)
  Dtos/           # Request DTOs (CreateTaskRequest, UpdateTaskRequest,
  │               # TaskQueryParams) and TaskItemDto response
  Endpoints/      # TaskEndpoints.MapTaskEndpoints() extension
  Infrastructure/ # AppDbContext, EF model config, indexes
  Services/       # ITaskService / TaskService (CRUD + filtering + paging)
  Program.cs      # DI wiring, middleware, OpenAPI, health, CORS
```

**Request lifecycle:**

```
HTTP Request
  → JWT validation (JwtBearerMiddleware)
  → Authorization policy (RequireAuthorization)
  → Minimal API handler
  → ITaskService (business logic)
  → AppDbContext (EF Core)
  → PostgreSQL
  → TaskItemDto (mapped)
  → JSON response
```

---

### Identity Provider — Keycloak 26.1

Pre-configured realm `taskapp` is automatically imported on first start.

| Configuration | Value |
|---------------|-------|
| Realm | `taskapp` |
| Public client | `taskapp-frontend` (PKCE, redirect `http://localhost:4200/*`) |
| Bearer-only client | `taskapp-backend` (audience for JWT validation) |
| Test users | `testuser` (role: user), `adminuser` (roles: user, admin) |
| Token algorithm | RS256 |

---

### Database — PostgreSQL 16

| Configuration | Value |
|---------------|-------|
| Image | `postgres:16-alpine` |
| Database | `taskappdb` |
| Schema | Single `tasks` table |
| Indexes | `status`, `priority`, `due_date`, `created_at` |

**Task table columns:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `title` | VARCHAR | Required |
| `description` | TEXT | Optional |
| `status` | VARCHAR | `Todo` \| `InProgress` \| `Done` |
| `priority` | VARCHAR | `Low` \| `Medium` \| `High` |
| `due_date` | TIMESTAMPTZ | Optional |
| `assignee` | VARCHAR | Optional |
| `created_at` | TIMESTAMPTZ | Set on create |
| `updated_at` | TIMESTAMPTZ | Updated on every write |

---

## Data Flow — Create Task

```
1. User fills task form (Angular TaskFormComponent)
2. TaskService.createTask(request) → POST /api/tasks
3. authInterceptor adds Authorization header
4. nginx proxy forwards to backend container
5. JwtBearerMiddleware validates token against Keycloak JWKS
6. TaskEndpoints handler calls ITaskService.CreateAsync(dto)
7. TaskService sets Id = Guid.NewGuid(), CreatedAt/UpdatedAt = UtcNow
8. EF Core INSERT INTO tasks ...
9. Response: 201 Created + TaskItemDto body
10. Angular updates task list signal
```

---

## Docker Compose Services

```yaml
services:
  postgres:    # postgres:16-alpine — persistent volume
  keycloak:    # quay.io/keycloak/keycloak:26.1 — realm auto-import
  backend:     # mcr.microsoft.com/dotnet/aspnet:10.0 — depends on postgres, keycloak
  frontend:    # nginx:alpine — depends on backend
```

All services share the `taskapp-network` bridge network. Only ports 4200, 5000, 8080, and 5432 are exposed to the host.

---

## Security Considerations

- All API endpoints require a valid JWT (`RequireAuthorization()`)
- JWT signature is verified using Keycloak's public RSA key via JWKS discovery
- HTTPS metadata requirement is relaxed only in Development (`RequireHttpsMetadata = false`)
- CORS is restricted to the Angular origin (configurable via `Cors:AllowedOrigins`)
- Containers run as non-root users
- Sensitive values (passwords, secrets) are read from environment variables, never hardcoded
- PostgreSQL is not directly accessible from the frontend container
