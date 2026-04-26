# Password Reset Limit Feature Report

## Overview

A new security and rate-limiting feature has been implemented to restrict users from resetting their passwords more than once every 30 days. This prevents abuse of the password recovery system and ensures account stability.

## Implementation Details

- **Field Added**: `LastPasswordResetAt` was added to the `ApplicationUser` model.
- **Logic Location**: The check is performed in the `ForgotPasswordAsync` method within the `IdentityService`.
- **Persistence**: The timestamp is updated in the database immediately after a successful `ResetPasswordAsync` operation.

## API Endpoint: Forgot Password

- **URL**: `/api/auth/forgot-password`
- **Method**: `POST`
- **Constraint**: If `(CurrentTime - LastPasswordResetAt) < 30 days`, the request is rejected.

### Successful Response (Within Limit)

When a user is eligible for a reset:

```json
{
  "isSuccess": true,
  "message": "Reset code sent to your email successfully",
  "data": null,
  "statusCode": 200,
  "timestamp": "2026-04-21T17:30:00Z"
}
```

### Error Response (Exceeding Limit)

If the user tries to request a reset within 30 days of their last successful reset:

**Response Structure:**

```json
{
  "isSuccess": false,
  "message": "You can only reset your password once every 30 days. Please try again in 25 days.",
  "data": null,
  "statusCode": 400,
  "errors": null,
  "timestamp": "2026-04-21T17:35:00Z"
}
```

## How the Message Looks

The error message is dynamic and calculates the remaining days and returns it to the user.

- **Example**: `You can only reset your password once every 30 days. Please try again in 14 days.`

## Database Changes

A new migration `AddLastPasswordResetAtToUser` has been generated to add the `LastPasswordResetAt` column to the `Users` table.
