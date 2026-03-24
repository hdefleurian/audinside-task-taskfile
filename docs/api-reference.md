# API Reference

Base URL: `http://localhost:5000` (development) / `http://backend:8080` (Docker internal)

All endpoints require an `Authorization: Bearer <token>` header obtained from Keycloak.

Interactive documentation (Scalar): `http://localhost:5000/scalar`

---

## Authentication

The API uses **JWT Bearer** authentication. Tokens are issued by Keycloak.

### Obtaining a token (PKCE flow)

The Angular frontend handles the full OIDC Authorization Code + PKCE flow automatically via `angular-auth-oidc-client`.

For direct API testing, you can obtain a token with the Resource Owner Password flow (development only):

```bash
curl -X POST http://localhost:8080/realms/taskapp/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=taskapp-frontend" \
  -d "username=testuser" \
  -d "password=Test1234!"
```

Use the returned `access_token` in the `Authorization` header.

---

## Data Models

### TaskItem

```json
{
  "id":          "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title":       "Implement login page",
  "description": "Create the Keycloak-backed login UI",
  "status":      "Todo",
  "priority":    "High",
  "dueDate":     "2025-12-31T00:00:00Z",
  "assignee":    "alice",
  "createdAt":   "2025-01-15T10:30:00Z",
  "updatedAt":   "2025-01-15T10:30:00Z"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Server-generated |
| `title` | string | Required |
| `description` | string \| null | Optional |
| `status` | string enum | `Todo` \| `InProgress` \| `Done` |
| `priority` | string enum | `Low` \| `Medium` \| `High` |
| `dueDate` | ISO 8601 \| null | Optional |
| `assignee` | string \| null | Optional |
| `createdAt` | ISO 8601 | Server-generated |
| `updatedAt` | ISO 8601 | Updated on every write |

### PagedResult\<T\>

```json
{
  "items":      [ ...TaskItem ],
  "totalCount": 42,
  "page":       1,
  "pageSize":   20
}
```

---

## Endpoints

### GET /api/tasks

Returns a paginated list of tasks.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | — | Filter by status: `Todo`, `InProgress`, `Done` |
| `priority` | string | — | Filter by priority: `Low`, `Medium`, `High` |
| `search` | string | — | Full-text search on title and description |
| `sortBy` | string | `createdAt` | Sort field: `createdAt`, `dueDate`, `priority`, `title` |
| `sortDirection` | string | `desc` | `asc` or `desc` |
| `page` | integer | `1` | Page number (1-based) |
| `pageSize` | integer | `20` | Items per page (1–100) |

**Response: 200 OK**

```json
{
  "items": [ ...TaskItem ],
  "totalCount": 5,
  "page": 1,
  "pageSize": 20
}
```

**Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/tasks?status=Todo&sortBy=dueDate&sortDirection=asc&page=1&pageSize=10"
```

---

### GET /api/tasks/{id}

Returns a single task by ID.

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Task identifier |

**Response: 200 OK** — `TaskItem`

**Response: 404 Not Found**

```json
{ "type": "...", "title": "Not Found", "status": 404 }
```

**Example:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6"
```

---

### POST /api/tasks

Creates a new task.

**Request body:**

```json
{
  "title":       "Implement login page",
  "description": "Optional description",
  "status":      "Todo",
  "priority":    "High",
  "dueDate":     "2025-12-31T00:00:00Z",
  "assignee":    "alice"
}
```

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `title` | ✅ | string | Max 500 chars |
| `description` | — | string \| null | — |
| `status` | — | string enum | Defaults to `Todo` |
| `priority` | — | string enum | Defaults to `Medium` |
| `dueDate` | — | ISO 8601 \| null | — |
| `assignee` | — | string \| null | — |

**Response: 201 Created** — `TaskItem`

`Location` header: `/api/tasks/{id}`

**Example:**

```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"New task","priority":"High"}'
```

---

### PUT /api/tasks/{id}

Updates an existing task. Only provided fields are updated (partial update).

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Task identifier |

**Request body:** (all fields optional)

```json
{
  "title":       "Updated title",
  "description": "Updated description",
  "status":      "InProgress",
  "priority":    "Low",
  "dueDate":     null,
  "assignee":    "bob"
}
```

**Response: 200 OK** — updated `TaskItem`

**Response: 404 Not Found**

**Example:**

```bash
curl -X PUT http://localhost:5000/api/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"Done"}'
```

---

### DELETE /api/tasks/{id}

Deletes a task.

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Task identifier |

**Response: 204 No Content**

**Response: 404 Not Found**

**Example:**

```bash
curl -X DELETE http://localhost:5000/api/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Health Check

### GET /health

Returns the API and database health status. Does **not** require authentication.

**Response: 200 OK**

```json
{ "status": "Healthy" }
```

**Response: 503 Service Unavailable** when the database is unreachable.

---

## Error Responses

All errors follow the RFC 9457 Problem Details format:

```json
{
  "type":   "https://tools.ietf.org/html/rfc9110#section-15.5.5",
  "title":  "Not Found",
  "status": 404,
  "detail": "Task with id '...' was not found.",
  "traceId": "..."
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error — check request body |
| 401 | Missing or invalid JWT |
| 403 | Insufficient role/scope |
| 404 | Resource not found |
| 500 | Internal server error |
