## Context

Read these files before doing anything:

- `src/environments/environment.ts`
- `src/app/core/interceptors/api.interceptor.ts`
- `src/app/core/services/auth.service.ts`
- `src/app/core/guards/auth.guard.ts`
- `src/app/core/models/` (all files)

---

## Task

Prepare the entire API integration infrastructure. No real endpoints yet — just clean, production-ready scaffolding that is easy to fill in later.

### 1 — HTTP Interceptor (`api.interceptor.ts`)

Make sure it:

- Attaches JWT token from localStorage to every request as `Authorization: Bearer <token>`
- Handles `401` responses — clear auth state and redirect to `/auth/login`
- Handles `500` errors gracefully — do not crash the app
- Skips auth header for public endpoints (login, register)

### 2 — Auth Service (`auth.service.ts`)

Replace the current mock with a real API-ready structure:

- `login(email, password)` → `POST /auth/login` — returns JWT + user info
- `register(name, username, email, password)` → `POST /auth/register`
- `logout()` → clears localStorage, redirects to `/auth/login`
- `refreshToken()` → `POST /auth/refresh` — placeholder, called by interceptor on 401
- `getCurrentUser()` → reads user from localStorage (saved on login)
- `isAuthenticated()` → checks token existence + expiry
- Store token as `emotra_token`, user as `emotra_user` in localStorage
- All methods return `Observable` — ready to swap mock for real HTTP call instantly
- Add a comment on each method: `// TODO: replace with real API call`

### 3 — API Response Wrapper Model

Create `src/app/core/models/api-response.model.ts`:

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 4 — Error Handling Service

Create `src/app/core/services/error-handler.service.ts`:

- `handleError(error: HttpErrorResponse): string` — returns a readable message
- Handle 400, 401, 403, 404, 422, 500 with clear messages
- Used by all services — never handle HTTP errors directly in components

### 5 — environment.ts

Make sure it has:

```typescript
export const environment = {
  production: false,
  apiUrl: "http://127.0.0.1:8000",
  tokenKey: "emotra_token",
  userKey: "emotra_user",
};
```

---

## Rules

- No real API endpoints yet — all service methods have `// TODO` comments
- Every service uses `HttpClient` from `@angular/common/http`
- All API URLs use `environment.apiUrl` — never hardcoded
- Zero errors on `ng serve`
