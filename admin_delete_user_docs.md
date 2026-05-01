# Admin: Permanent User Deletion (Nuclear Delete)

This document outlines the security protocols and implementation details for the permanent deletion of user accounts by administrators.

## Endpoint Specification

- **Route**: `DELETE /api/admin/users/{id}`
- **Authentication**: Requires `AdminOnly` policy.
- **Request Body**:
  ```json
  {
    "adminPassword": "YOUR_ADMIN_PASSWORD"
  }
  ```

## Security Protocols

### 1. Identity Verification
Unlike standard deletions, this endpoint requires the administrator to re-enter their password. This is a **Security Challenge** to prevent:
- Unauthorized deletion via an unattended admin session.
- Accidental deletions of entire user histories.

### 2. Self-Deletion Prevention
An administrator **cannot** delete their own account through this endpoint. Any attempt to do so will return a `400 Bad Request`.

### 3. Atomic Transactions
The entire deletion process is wrapped in a **Database Transaction**. If any part of the record purging fails, the transaction is rolled back, and the user account remains intact.

## Cascading Deletion Behavior

When a user is deleted, the system performs a **Hard Purge** of all related data. This action is **irreversible**. The following records are permanently removed:

| Entity | Scope |
| :--- | :--- |
| **User Account** | Identity record, Roles, and Claims. |
| **Analyses** | All records from Text, Audio, Video, and Image analysis. |
| **Analysis Results** | Emotion Timelines, Details, Summaries, and Sentence-level scores. |
| **Media Files** | Storage paths and metadata for all uploaded content. |
| **Feedback** | All session-specific feedback and analysis ratings. |
| **Testimonials** | All public and private system feedback (SystemFeedback). |
| **Bug Reports** | All bug reports submitted by the user. |
| **Alerts** | All system alerts triggered for or by the user. |
| **Settings** | All personalized user settings and preferences. |

## Response States

- `200 OK`: User and all data successfully purged.
- `401 Unauthorized`: Admin password incorrect or session invalid.
- `403 Forbidden`: Requester does not have Administrative privileges.
- `404 Not Found`: Target user ID does not exist.
- `400 Bad Request`: Attempting to delete own account.
- `500 Internal Server Error`: Critical failure during cascading delete (transaction rolled back).
