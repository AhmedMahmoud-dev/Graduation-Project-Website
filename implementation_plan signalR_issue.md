# Add `/api/auth/session` Endpoint for Direct SignalR Authentication

Introduce a new GET `/api/auth/session` endpoint in the Backend. This endpoint will be protected by standard JWT bearer/cookie authentication, retrieve the currently authenticated user's profile information, extract their active JWT token, and return a `LoginResponseDto` in the response body. 

This will allow the frontend to safely retrieve the JWT token on startup/refresh via a proxied HTTP call (where the first-party HTTP-only cookie is allowed), and then use it to establish a direct WebSocket connection (`wss://`) to the backend server, bypassing both Vercel's lack of WebSocket support and third-party cookie blocking.

## User Review Required

No breaking changes are introduced. This is a purely additive API endpoint.

## Proposed Changes

---

### Backend Service Abstractions

#### [MODIFY] [IIdentityService.cs](file:///c:/Graduation%20Project/Backend/EmotionDetectionSolution/Core/ServiceAbstraction/IIdentityService.cs)
- Add a new method signature:
  `Task<ApiResponse<object>> GetSessionAsync(string userId, string token);`

---

### Backend Core Implementation

#### [MODIFY] [IdentityService.cs](file:///c:/Graduation%20Project/Backend/EmotionDetectionSolution/Core/Service/IdentityService.cs)
- Implement `GetSessionAsync(string userId, string token)`:
  1. Retrieve the user by `userId` using `_userManager`.
  2. Verify the user exists and is active.
  3. Get the user's roles using `_userManager.GetRolesAsync`.
  4. Decode the expiration time from the JWT token using `JwtSecurityTokenHandler`.
  5. Construct and return a `LoginResponseDto` containing user details, the active token, and expiration time.

---

### Backend Web API Controllers

#### [MODIFY] [AuthController.cs](file:///c:/Graduation%20Project/Backend/EmotionDetectionSolution/EmotionDetection/Controllers/AuthController.cs)
- Add `using Microsoft.AspNetCore.Authorization;` at the top of the file.
- Implement the `[Authorize]` `[HttpGet("session")]` endpoint:
  1. Retrieve `userId` from the `ClaimsPrincipal`.
  2. Extract the active JWT token from the `EmotraAuthToken` cookie or the `Authorization` header.
  3. Call `_identityService.GetSessionAsync(userId, token)`.
  4. Return the response.

## Verification Plan

### Automated Tests
- Run `dotnet build` to ensure the changes compile without errors.

### Manual Verification
- We can verify the endpoint locally using Postman or a simple curl command once deployed/run.
