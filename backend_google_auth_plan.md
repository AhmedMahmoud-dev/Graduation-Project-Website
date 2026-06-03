# Backend Requirements: Secure Google OAuth Integration

This document outlines the required backend modifications to support a fully custom Google Sign-In button on the frontend. Since the frontend is a Single Page Application (SPA) built with Angular, we are moving away from Google's iframe overlay to prevent clickjacking blocks in production.

We propose two options. **Option A is recommended** as it aligns perfectly with the current JWT token-based authentication architecture.

---

## Option A: Authorization Code Flow (Recommended)
This is the standard pattern for Single Page Applications. The frontend handles the redirect to Google and captures the temporary authorization code, then sends it to the backend via a secure POST request to exchange for app credentials.

```
Frontend Custom Button -> Google Login Screen -> Redirect back to Frontend callback ->
POST code to Backend -> Backend exchanges code for ID Token -> Returns App JWT to Frontend
```

### Backend Tasks:
1. **Create Code Exchange Endpoint**:
   * **Route**: `POST /api/auth/google/exchange`
   * **Payload**: 
     ```json
     {
       "code": "4/0AdQt8...",
       "redirect_uri": "http://localhost:4200/auth/google/callback"
     }
     ```
   * **Logic**:
     1. Receive the code and `redirect_uri` from the frontend.
     2. Make a secure backend-to-backend request to Google's token endpoint (`https://oauth2.googleapis.com/token`) to exchange the authorization code for an `id_token` and `access_token` using your client secret:
        ```http
        POST https://oauth2.googleapis.com/token
        Content-Type: application/x-www-form-urlencoded

        code={code}
        &client_id={your_client_id}
        &client_secret={your_client_secret}
        &redirect_uri={redirect_uri}
        &grant_type=authorization_code
        ```
     3. Extract the `id_token` (JWT) returned from Google.
     4. Validate the signature, audience (`client_id`), and expiration of the returned `id_token`.
     5. Extract the user's email, name, and profile photo from the token.
     6. Find or create the user in your database.
     7. Generate your application's JWT login token (exactly as the existing `/api/auth/google` endpoint does).
     8. Return the user payload and JWT token in the JSON response body.

---

## Option B: Backend-Driven Redirect Flow (Cookie / Redirection)
In this flow, the backend handles all Google redirection and callback operations, and redirects the browser back to the frontend.

```
Frontend Custom Button -> GET Backend Start -> Google Login Screen -> 
GET Backend Callback -> Exchange Code -> Redirect to Frontend Dashboard with Token
```

### Backend Tasks:
1. **Create Authorization Start Endpoint**:
   * **Route**: `GET /api/auth/google/start`
   * **Logic**:
     * Build the Google Authorization URL:
       `https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&redirect_uri={backend_callback_uri}&response_type=code&scope=openid%20email%20profile&state={state}`
     * Redirect the user's browser to this URL.

2. **Create Authorization Callback Endpoint**:
   * **Route**: `GET /api/auth/google/callback`
   * **Logic**:
     1. Receive the authorization `code` and `state` parameters from Google.
     2. Exchange the `code` using Google's token endpoint and your client secret.
     3. Find or create the user in your database.
     4. **Session Hand-off**:
        * **Option 1 (Recommended)**: Set a secure, `HttpOnly`, `SameSite=Lax` cookie containing the application JWT/session, then redirect the user directly to the frontend dashboard: `https://yourdomain.com/dashboard`.
        * **Option 2**: Generate your app JWT and redirect the browser back to the frontend dashboard with the token as a query parameter (e.g. `https://yourdomain.com/dashboard?token=JWT_TOKEN`). *Note: This is less secure than HttpOnly cookies as the token is visible in browser history.*

---

## Security & Console Requirements:
* **Client Secret Safety**: The Client Secret must **never** be exposed or sent to the Angular frontend. All code exchanges must happen securely on the backend.
* **Console Redirect URI Registration**: Ensure that whatever redirect URI is used (either the frontend callback URL for Option A, or the backend callback URL for Option B) is registered in the **Authorized redirect URIs** list under your Client ID credentials in the **Google Cloud Console**.
