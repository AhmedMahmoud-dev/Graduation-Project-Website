# Professional Backend Plan: Secure Password Reset for Google Users

This plan describes the industry-standard secure implementation for the **Forgot Password** flow when dealing with Google Sign-In users. 

---

## 1. Goal: Prevent Email Enumeration & Protect Google Accounts

To follow professional security standards (preventing attackers from discovering registered emails or login methods):
* The public API should **always** return a successful `200 OK` generic message, regardless of whether the email exists, is inactive, or is a Google account.
* If the account uses Google Sign-In (no password), the backend sends a specialized email informing the user that they should log in with Google, rather than exposing this info on the screen.

---

## 2. Proposed Changes in `IdentityService.cs`

Modify `ForgotPasswordAsync(ForgotPasswordDto dto)` in `Core/Service/IdentityService.cs` to follow this flow:

### A. Non-Existent Users (Fail Silently)
If `user == null`, do not return `BadRequest`. Return the generic success response immediately:
```csharp
if (user == null)
{
    return ApiResponse<object>.Success("Reset code sent to your email successfully");
}
```

### B. Inactive Users (Fail Silently)
If `!user.IsActive`, do not return `BadRequest`. Return the generic success response immediately:
```csharp
if (!user.IsActive)
{
    return ApiResponse<object>.Success("Reset code sent to your email successfully");
}
```

### C. Google Sign-In Users (Send Explanatory Email & Fail Silently)
If `string.IsNullOrEmpty(user.PasswordHash)` is `true`:
1. Send a specialized explanation email using `_emailService.SendEmailAsync`:
   ```csharp
   var emailBody = $@"
       <h2>Google Sign-In Account</h2>
       <p>Hello {user.FirstName},</p>
       <p>We received a request to reset the password for your account.</p>
       <p>However, your account is configured to log in using <strong>Google Sign-In</strong>. You do not have a password set up with us.</p>
       <p>To access your account, please sign in directly using the <strong>Continue with Google</strong> button on the login page.</p>
   ";
   
   await _emailService.SendEmailAsync(user.Email ?? string.Empty, "Accessing your account", emailBody);
   ```
2. Return the generic success response so the caller cannot tell this is a Google account:
   ```csharp
   return ApiResponse<object>.Success("Reset code sent to your email successfully");
   ```

---

## 3. Second Line of Defense in `ResetPasswordAsync`

Keep the strict validation inside `ResetPasswordAsync` to block direct password reset attempts if someone manually calls the reset API with a Google user email:
```csharp
if (string.IsNullOrEmpty(user.PasswordHash))
{
    return ApiResponse<object>.BadRequest("This account uses Google Sign-In. Password reset is not available.");
}
```
