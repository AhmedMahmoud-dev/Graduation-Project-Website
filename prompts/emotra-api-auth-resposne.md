Request body:
{
"email": "user@example.com",
"password": "string",
"firstName": "string",
"lastName": "string"

}
response be like:

{
"isSuccess": true,
"message": "User registered successfully",
"data": null,
"statusCode": 200,
"errors": null,
"timestamp": "2026-03-24T12:31:59.0529726Z"
}
error be like:

{
"isSuccess": false,
"message": "User already exists",
"data": null,
"statusCode": 400,
"errors": null,
"timestamp": "2026-03-24T12:45:09.5378709Z"
}
another response type:

{
"type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
"title": "One or more validation errors occurred.",
"status": 400,
"errors": {
"Password": [
"Password must be at least 6 characters."
]
},
"traceId": "00-27f6f0dae1f70c2f11421b9e30914a9f-63be52e048ab7e2a-00"
}
and with login: same as register, but remove (register, and put login at the end)..

{
"isSuccess": true,
"message": "Login successful",
"data": {
"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlZjlkNzdjMC1jM2ZjLTQ3YzEtYTE4NS1jMTRkODQyMTU4YTYiLCJlbWFpbCI6InRlc3QxMTExQGdtYWlsLmNvbSIsImp0aSI6ImEyMWJiNGYwLTJlNGYtNDdmOS04OTkzLWE2YzJlZTY0YzUzNSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiZWY5ZDc3YzAtYzNmYy00N2MxLWExODUtYzE0ZDg0MjE1OGE2IiwiZnVsbE5hbWUiOiJhaG1lZCBtYWhtb3VkIiwiaXNBY3RpdmUiOiJUcnVlIiwiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS93cy8yMDA4LzA2L2lkZW50aXR5L2NsYWltcy9yb2xlIjoiVXNlciIsImV4cCI6MTc3NDQ0MzMyMywiaXNzIjoiTXlBcHAiLCJhdWQiOiJNeUFwcFVzZXJzIn0.IeSMHza1BxqUcK3hU28qKXW0hOv6ysQGJBa986EfifI",
"userId": "ef9d77c0-c3fc-47c1-a185-c14d842158a6",
"email": "test1111@gmail.com",
"fullName": "ahmed mahmoud",
"roles": [
"User"
],
"expiresAt": "2026-03-25T12:55:23.8119037Z"
},
"statusCode": 200,
"errors": null,
"timestamp": "2026-03-24T12:55:23.8120051Z"
}
{
"isSuccess": false,
"message": "Invalid credentials",
"data": null,
"statusCode": 400,
"errors": null,
"timestamp": "2026-03-24T12:56:33.4188977Z"
}
