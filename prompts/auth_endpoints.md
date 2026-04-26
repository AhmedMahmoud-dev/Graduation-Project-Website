# Authentication API Documentation

This document describes the authentication endpoints available in the Emotion Detection API. All requests and responses use **application/json** and follow **snake_case** naming conventions.

---

## 1. Register
Create a new user account.

**Endpoint:** `POST /api/auth/register`

### Request Body
```json
{
  "email": "example@gmail.com",
  "password": "Password123!",
  "first_name": "Ahmed",
  "last_name": "Mahmoud"
}
```

### Success Response
**Status:** `200 OK`
```json
{
  "is_success": true,
  "message": "User registered successfully",
  "data": null,
  "status_code": 200,
  "errors": null,
  "timestamp": "2026-04-14T19:47:23Z"
}
```

---

## 2. Login
Authenticate a user and receive a JWT token.

**Endpoint:** `POST /api/auth/login`

### Request Body
```json
{
  "email": "example@gmail.com",
  "password": "Password123!"
}
```

### Success Response
**Status:** `200 OK`
```json
{
  "is_success": true,
  "message": "Login successful",
  "data": {
    "token": "token_work",
    "user_id": "user_id_guid",
    "email": "example@gmail.com",
    "full_name": "Ahmed Mahmoud",
    "roles": ["User"],
    "expires_at": "2026-04-15T19:47:23Z"
  },
  "status_code": 200,
  "errors": null,
  "timestamp": "2026-04-14T19:47:23Z"
}
```

---

## 3. Forgot Password
Request a password reset code.

**Endpoint:** `POST /api/auth/forgot-password`

### Request Body
```json
{
  "email": "example@gmail.com"
}
```

### Success Response
**Status:** `200 OK`
```json
{
  "is_success": true,
  "message": "Reset code sent to your email successfully",
  "data": null,
  "status_code": 200,
  "errors": null,
  "timestamp": "2026-04-14T19:47:23Z"
}
```

---

## 4. Reset Password
Reset the password using the code received via email.

**Endpoint:** `POST /api/auth/reset-password`

### Request Body
```json
{
  "email": "example@gmail.com",
  "token": "123456",
  "new_password": "NewPassword123!"
}
```

### Success Response
**Status:** `200 OK`
```json
{
  "is_success": true,
  "message": "Password reset successfully",
  "data": null,
  "status_code": 200,
  "errors": null,
  "timestamp": "2026-04-14T19:47:23Z"
}
```

---

## Error Handling

The API uses a standard error response structure for various failure scenarios.

### Validation Error (400)
Occurs when the request body is missing required fields or has invalid formats.

```json
{
  "is_success": false,
  "message": "Registration failed",
  "data": null,
  "status_code": 400,
  "errors": [
    "Email is invalid",
    "Password must be at least 6 characters."
  ],
  "timestamp": "2026-04-14T19:47:23Z"
}
```

### Unauthorized / Invalid Credentials (400/401)
Occurs when login credentials do not match or a token is invalid.

```json
{
  "is_success": false,
  "message": "Invalid credentials",
  "data": null,
  "status_code": 400,
  "errors": null,
  "timestamp": "2026-04-14T19:47:23Z"
}
```

### Internal Server Error (500)
Occurs when an unexpected server error happens.

```json
{
  "is_success": false,
  "message": "An error occurred during registration",
  "data": null,
  "status_code": 500,
  "errors": [
    "Details of the error (if available)"
  ],
  "timestamp": "2026-04-14T19:47:23Z"
}
```
