### 2.1 Report a Bug

Submits a technical issue or bug report.

- **Endpoint:** `POST /api/support/bug-report`
- **Authentication:** Required (Bearer Token)

#### Request Body

- `title`: (string) Short summary of the bug.
- `description`: (string) Detailed steps to reproduce or behavior.
- `category`: (string) e.g., "UI/UX", "Analysis Error", "Login Issue".
- `priority`: (string) "Low", "Medium", "High".
- `metadata`: (object, optional) Context like browser version or screen size.

```json
{
  "title": "Sidebar overlap on mobile",
  "description": "The sidebar covers the main content when viewed on iPhone 13.",
  "category": "UI/UX",
  "priority": "Medium",
  "metadata": {
    "viewport": "390x844",
    "browser": "Safari"
  }
}
```

#### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Bug report submitted successfully. Thank you for your feedback!",
  "data": 42,
  "status_code": 200
}
```

---
