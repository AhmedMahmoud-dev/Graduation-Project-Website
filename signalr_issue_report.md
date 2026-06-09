# SignalR and WebSockets Routing Issue Report

---

## 1. Context and Current Architecture
To resolve the third-party cookie blocking issues on mobile browsers (caused by Safari's ITP and Chrome's privacy settings), we proxied all HTTP API requests through Vercel. 
*   **Frontend Origin:** `https://emotra.vercel.app`
*   **Backend Origin:** `https://emotion-detection.runasp.net`
*   **API Proxy Route:** `/api/(.*)` -> `https://emotion-detection.runasp.net/api/$1`

This change successfully resolved the login/session issue on mobile browsers because all `/api` requests are now first-party, allowing cookies to be accepted and sent.

---

## 2. The Core Problem with WebSockets
While proxying HTTP `/api` requests works perfectly, proxying the SignalR Hub (`/hubs/notifications`) through Vercel breaks real-time updates.

### A. Vercel Does Not Support WebSockets
Vercel is a serverless platform and its routing layer does not support persistent TCP/WebSocket connections (`wss://`). When the browser attempts to establish a WebSocket connection via `wss://emotra.vercel.app/hubs/notifications`, it fails with the following console error:
```
WebSocket connection to 'wss://emotra.vercel.app/hubs/notifications?id=...' failed
```

### B. Fallback Degradation (Long Polling and Timeouts)
When WebSockets fail, SignalR downgrades the transport to **Long Polling** or **Server-Sent Events (SSE)**. 
Because Vercel serverless functions have a strict execution timeout (typically 10 to 15 seconds), the long-running connections are repeatedly terminated by Vercel. 
This causes:
*   Continuous disconnection and reconnection loops.
*   Massive lag and lost packets for real-time alerts.
*   Severe delays in detecting user connection/disconnection, rendering the "online/offline" states in user list and support queue highly inaccurate.

---

## 3. The Authentication Dilemma on Page Refresh
To make WebSockets work instantly and reliably, the frontend must connect **directly** to the backend WebSocket server (`wss://emotion-detection.runasp.net/hubs/notifications`) instead of proxying through Vercel. 

However, this introduces an authentication issue when the user refreshes the page:
1.  **On Login:** The frontend receives the JWT token in the HTTP response body and initializes SignalR using the token in the query string (`initSignalR(user.token)`). This works directly with the backend because it does not rely on cookies.
2.  **On Refresh / App Load:** For security reasons, the frontend does not save the JWT token in `localStorage` (`AuthService.saveAuth` deletes it, saving only the profile data). On refresh, the token is empty.
3.  **Cookie Fallback:** Because the token is empty, SignalR falls back to using the HTTP-only cookie (`withCredentials: true`). If the connection is direct to `https://emotion-detection.runasp.net`, mobile browsers block the cookie (third-party blocking), causing SignalR to fail to authenticate.

---

## 4. Proposed Solution

We can resolve this by getting the token via a secure, proxied HTTP call on startup, then using it to establish a direct WebSocket connection.

### Step 1: Backend Action
Please verify if there is an endpoint—or create one if it doesn't exist—such as `/api/auth/me` or `/api/auth/session` that:
1.  Is secured via the standard HTTP-only cookie.
2.  Returns the current authenticated user's details **including the active JWT token in the response body**.
    *   *Example endpoint:* `GET /api/auth/session` or `GET /api/auth/me`

### Step 2: Frontend Action (To be done after Backend is ready)
1.  On startup, the frontend calls the new endpoint (which goes through the Vercel proxy, so the cookie is sent and accepted).
2.  The frontend extracts the JWT token from the response body and stores it in-memory.
3.  The frontend initializes SignalR **directly** to `wss://emotion-detection.runasp.net/hubs/notifications` using this token. WebSockets will connect natively and instantly, bypassing both Vercel and mobile cookie restrictions.

---

## 5. Questions for the Backend Agent
Please answer the following questions in your response `.md` report:
1.  Is there an existing endpoint that returns the current user's profile **with** the JWT token in the response body? If so, what is the exact route path and HTTP method?
2.  If not, can you implement a `/api/auth/session` or `/api/auth/me` endpoint that does this?
3.  Once the endpoint is ready or if there is another issue identified in the backend, please detail what was modified/fixed in your report.
