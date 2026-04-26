# Implement V2 Settings Appearance Endpoints

Build `GET/PUT/DELETE /api/settings/appearance` as defined in `settings_endpoints.md`.

## Key Design Decision

> [!IMPORTANT]
> **The old `UserSettings` model stores completely different data** (alert thresholds, notification prefs, language). The new spec is about **appearance/theme colors** — a totally different domain.
>
> **Approach:** Add a `AppearanceSettingsJson` column to the existing `UserSettings` table (as a JSON string). This avoids creating an entirely new table while keeping the data cleanly separated. The V2 service reads/writes only this column.
>
> **Alternative:** Create a brand new `AppearanceSettings` table. This is cleaner but requires a migration. Let me know if you prefer this.

## Proposed Changes

### 1. Domain Model

#### [MODIFY] [UserSettings.cs](file:///c:/Graduation%20Project/Backend/EmotionDetectionSolution/Core/DomainLayer/Models/UserSettings.cs)

Add one new property:

```csharp
public string? AppearanceSettingsJson { get; set; }
```

This stores the entire appearance payload (light_theme, dark_theme, emotion_colors, active_theme) as a serialized JSON string.

---

### 2. New V2 DTOs

#### [NEW] `Shared/DTOs/SettingsV2/AppearanceSettingsDto.cs`

```csharp
public class AppearanceSettingsDto
{
    public ThemeColorsDto? LightTheme { get; set; }
    public ThemeColorsDto? DarkTheme { get; set; }
    public Dictionary<string, string>? EmotionColors { get; set; }
    public string? ActiveTheme { get; set; }  // "light", "dark", "system"
}

public class ThemeColorsDto
{
    public string? ColorBg { get; set; }
    public string? ColorSurface { get; set; }
    public string? ColorBorder { get; set; }
    public string? ColorText { get; set; }
    public string? ColorTextMuted { get; set; }
    public string? ColorPrimary { get; set; }
    public string? ColorAccent { get; set; }
}
```

> The global `snake_case` JSON serializer in `Program.cs` will automatically produce `color_bg`, `light_theme`, etc. — exactly matching the spec.

---

### 3. Service Layer

#### [NEW] `Core/ServiceAbstraction/ISettingsV2Service.cs`

```csharp
public interface ISettingsV2Service
{
    Task<ApiResponse<AppearanceSettingsDto>> GetAppearanceAsync(string userId);
    Task<ApiResponse<bool>> UpdateAppearanceAsync(string userId, AppearanceSettingsDto dto);
    Task<ApiResponse<bool>> ResetAppearanceAsync(string userId);
}
```

#### [NEW] `Core/Service/SettingsV2Service.cs`

- **GET**: Load `UserSettings` row → deserialize `AppearanceSettingsJson` → return. If null/empty, return `null` data so frontend falls back to defaults.
- **PUT**: Serialize the DTO → save to `AppearanceSettingsJson` column. Create the `UserSettings` row if it doesn't exist.
- **DELETE**: Set `AppearanceSettingsJson = null` → save.

---

### 4. Controller

#### [NEW] `EmotionDetection/Controllers/V2/SettingsV2Controller.cs`

- Route: `api/settings`
- `GET appearance` → calls `GetAppearanceAsync`
- `PUT appearance` → calls `UpdateAppearanceAsync`
- `DELETE appearance` → calls `ResetAppearanceAsync`

---

### 5. Wiring

#### [MODIFY] [Program.cs](file:///c:/Graduation%20Project/Backend/EmotionDetectionSolution/EmotionDetection/Program.cs)

Add DI registration:

```csharp
builder.Services.AddScoped<ISettingsV2Service, SettingsV2Service>();
```

---

## Files Summary

| Action     | File                                                      |
| ---------- | --------------------------------------------------------- |
| **MODIFY** | `UserSettings.cs` — add `AppearanceSettingsJson` property |
| **NEW**    | `Shared/DTOs/SettingsV2/AppearanceSettingsDto.cs`         |
| **NEW**    | `Core/ServiceAbstraction/ISettingsV2Service.cs`           |
| **NEW**    | `Core/Service/SettingsV2Service.cs`                       |
| **NEW**    | `EmotionDetection/Controllers/V2/SettingsV2Controller.cs` |
| **MODIFY** | `Program.cs` — add DI registration                        |

## Open Questions

> [!IMPORTANT]
>
> 1. **Do you also want to remove the old `/api/UserSettings` endpoints** (the same way we removed the old Analysis)? Or keep them for now since they handle alert/notification settings that are separate from appearance?
> 2. **Database migration**: Adding a column requires `dotnet ef migrations add`. Since you're using `EnsureCreatedAsync()` in dev, should I just add the property and let EF handle it, or do you want a formal migration?

## Verification Plan

### Automated Tests

- `dotnet build` — zero errors
- Manual Swagger test of all 3 endpoints
