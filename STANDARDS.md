# Nova AI — Code Standards

This document describes the conventions that all code in this repository must follow.
Established during the February 2026 standardization pass.

---

## 1. Frontend API Calls

### Single source of truth: `apiRequest`

All HTTP calls from the frontend must use the `apiRequest` utility from
`client/src/lib/queryClient.ts`.

**Signature**
```ts
apiRequest(url: string, method: string, data?: unknown, options?: { headers?: Record<string, string> }): Promise<any>
```

**Rules**
- Never use raw `fetch()` in page components or service files.
- Always use `credentials: 'include'` — `apiRequest` does this automatically.
- For GET requests, omit `data` entirely.
- For FormData uploads, pass the `FormData` object as `data` — `apiRequest` sets the correct `Content-Type` automatically.

**Examples**
```ts
// GET
const user = await apiRequest('/api/users/me', 'GET');

// POST with body
const result = await apiRequest('/api/conversations', 'POST', { title, customerId });

// PATCH
await apiRequest(`/api/conversations/${id}/status`, 'PATCH', { status });

// DELETE
await apiRequest(`/api/users/${id}`, 'DELETE');

// File upload
const fd = new FormData();
fd.append('file', file);
await apiRequest('/api/uploads', 'POST', fd);
```

### Service layer: `client/src/lib/api.ts`

Domain-specific service functions (e.g. `authApi`, `customersApi`) live here.
Every function in this file must call `apiRequest` — never raw `fetch()`.

### TanStack Query

- `useQuery` uses the global `queryFn` by default (maps the queryKey URL to a GET request).
- `useMutation` calls `apiRequest` inside `mutationFn` and invalidates cache afterward.
- Do not define a custom `queryFn` unless the URL has dynamic query parameters that cannot be expressed as a flat path.

---

## 2. Backend Route Structure

### Modular routes

New routes go into `server/routes/<domain>.routes.ts` and are registered via
`registerRoutes` in `server/routes/index.ts`.

Route files export a single `register<Domain>Routes(context: RouteContext)` function.

```ts
// server/routes/example.routes.ts
export function registerExampleRoutes({ app }: RouteContext) {
  app.get('/api/example', requireAuth, async (req, res) => { ... });
}
```

The legacy `server/routes.ts` is the original monolith — new code should not be
added there. Migrate existing sections into modular files over time.

---

## 3. Authentication Middleware

### Staff routes — `requireAuth` / `requireRole`

```ts
import { requireAuth, requireRole } from '../auth';

app.get('/api/admin/things', requireAuth, requireRole(['admin']), handler);
```

### Customer portal routes — `requireCustomerAuth`

All `/api/customer-portal/*` routes are protected by a single `app.use()` call
registered before the first route definition:

```ts
app.use('/api/customer-portal', requireCustomerAuth);
```

**Do not** add inline session checks inside individual customer portal handlers.
The middleware at `server/middleware/customerAuth.ts` is the single gate.

After the middleware runs, access the customer ID from the session directly:

```ts
app.get('/api/customer-portal/stats', async (req, res) => {
  const customerId = (req.session as any).customerId; // already authenticated
  ...
});
```

---

## 4. Error Handling

### Zod validation errors

All Zod validation failures must use `zodErrorResponse` from
`server/middleware/errors.ts`:

```ts
import { zodErrorResponse } from '../middleware/errors';

} catch (error) {
  if (error instanceof z.ZodError) {
    return res.status(400).json(zodErrorResponse(error));
  }
  res.status(500).json({ error: 'Descriptive message here' });
}
```

`zodErrorResponse` returns:
```json
{
  "error": "Human-readable summary from zod-validation-error",
  "details": ["field.path: specific message", ...]
}
```

### Global error handler

`globalErrorHandler` from `server/middleware/errors.ts` is registered last in
`registerRoutes`. It catches any error passed via `next(error)` and:
- Converts `ZodError` to a 400 with `zodErrorResponse`
- Converts everything else to a 500 with the error message

### Response shape conventions

| Scenario | Shape |
|---|---|
| Success (resource) | Return the resource object directly |
| Success (action) | `{ message: 'Human-readable confirmation' }` |
| Validation error | `{ error: string, details: string[] }` |
| Auth error | `{ error: 'Not authenticated' }` or `{ error: 'Forbidden' }` |
| Server error | `{ error: 'Descriptive message' }` |

---

## 5. WebSocket

All real-time communication goes through the single `ChatWebSocketServer`
instance in `server/websocket.ts`.

Client-side hooks that open a WebSocket connection:
- `useRealtimeNotifications` — general staff notifications
- `NotificationProvider` — unread counts
- `CustomerChatWidget` — anonymous customer chat

Avoid opening additional WebSocket connections in new components.
Instead, emit events through the existing server and react to them
in the appropriate hook.

---

## 6. File & Import Conventions

| Path alias | Maps to |
|---|---|
| `@/` | `client/src/` |
| `@shared/` | `shared/` |
| `@assets/` | `attached_assets/` |

- Do not import React explicitly — the Vite JSX transformer handles it.
- Use named exports, not default exports, for utility functions and hooks.
- Shared TypeScript types (Zod schemas, Drizzle inferred types) live in `shared/schema.ts`.
