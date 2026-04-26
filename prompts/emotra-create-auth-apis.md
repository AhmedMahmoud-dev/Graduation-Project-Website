## Context

Read these files before doing anything:

- `src/environments/environment.ts`
- `src/app/core/services/auth.service.ts`
- `src/app/core/models/api-response.model.ts`
- `src/app/core/interceptors/api.interceptor.ts`
- `src/app/features/auth/login/login.component.ts`
- `src/app/features/auth/register/register.component.ts`
- `src/app/app.config.ts`

---

## Task — Implement Real Auth API

Replace all mock auth logic with real HTTP calls.

### 1 — Update `environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: "http://emotiondetection.runasp.net",
  tokenKey: "emotra_token",
  userKey: "emotra_user",
};
```

### 2 — Update `api-response.model.ts`

Match the real API response shape exactly:

```typescript
export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T | null;
  statusCode: number;
  errors: string[] | null;
  timestamp: string;
}

// Validation error shape (from .NET ModelState)
export interface ValidationErrorResponse {
  type: string;
  title: string;
  status: number;
  errors: Record<string, string[]>;
  traceId: string;
}

export interface AuthUser {
  token: string;
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  expiresAt: string;
}
```

### 3 — Update `auth.service.ts`

**Register:**

- `POST /api/auth/register`
- Body: `{ email, password, firstName, lastName }`
- On `isSuccess: true` → show success message → redirect to `/auth/login`
- On `isSuccess: false` → throw error with `message` field
- On validation error (`.NET` shape with `errors` object) → extract and show field errors

**Login:**

- `POST /api/auth/login`
- Body: `{ email, password }`
- On `isSuccess: true` → save token to `localStorage` as `emotra_token`, save user object as `emotra_user` → redirect to `/dashboard`
- On `isSuccess: false` → throw error with `message` field
- `isAuthenticated()` → checks token exists + `expiresAt` is in the future
- `getCurrentUser()` → parses `emotra_user` from localStorage → returns `AuthUser | null`
- `logout()` → removes `emotra_token` and `emotra_user` → redirects to `/auth/login`

### 4 — Update `api.interceptor.ts`

- Read token from `localStorage.getItem(environment.tokenKey)`
- Attach as `Authorization: Bearer <token>` on every request
- Skip for `/api/auth/login` and `/api/auth/register`
- On `401` response → call `authService.logout()`
- Make sure `app.config.ts` uses:

```typescript
provideHttpClient(withFetch(), withInterceptors([apiInterceptor]));
```

### 5 — Update Login & Register Components

- Wire real service calls — remove any mock delays
- Show the `message` field from API response as error (e.g. "Invalid credentials", "User already exists")
- For register validation errors: map `.NET` `errors` object to the correct form fields
  - e.g. `errors.Password[0]` → show under password field
- Show a loading spinner on the submit button while request is in flight
- Disable the form while loading

---

## Error Handling Rules

- Never show raw HTTP errors to the user
- Always show the `message` field from `ApiResponse` when `isSuccess: false`
- For `.NET` validation errors: show per-field messages under the correct inputs
- Network errors (no connection): show "Unable to connect. Please check your internet."

---

## Output Requirements

- Zero TODOs — fully working login and register with real API
- `ng serve` zero errors
- Token saved correctly and used by interceptor
- `isAuthenticated()` checks token expiry using `expiresAt`
- Both light and dark mode look correct — no style changes needed
