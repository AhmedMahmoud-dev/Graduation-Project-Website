# Emotra — Settings Page: Theme & Emotion Color Customization

## Context
You are continuing work on Emotra. The settings page already exists at `/settings` inside the AppLayout. Read these files before doing anything:
- `src/app/features/settings/settings.component.ts`
- `src/styles.css` (all CSS variables for light and dark mode)
- `src/app/core/services/theme.service.ts`

---

## Your Task
Add two settings sections to the existing settings page:
1. **Theme Colors** — customize CSS variable colors for light and dark mode
2. **Emotion Colors** — customize the color for each of the 7 emotions

---

## Create: `core/services/color-settings.service.ts`

This service is the ONLY place that reads/writes color settings. Design it to be easily swappable to an API later — components never touch localStorage directly.

```typescript
@Injectable({ providedIn: 'root' })
export class ColorSettingsService {
  private readonly THEME_KEY = 'emotra_theme_colors';
  private readonly EMOTION_KEY = 'emotra_emotion_colors';

  saveThemeColors(light: Record<string, string>, dark: Record<string, string>): void { ... }
  getThemeColors(): { light: Record<string, string>, dark: Record<string, string> } { ... }

  saveEmotionColors(colors: Record<string, string>): void { ... }
  getEmotionColors(): Record<string, string> { ... }

  applyThemeColors(light: Record<string, string>, dark: Record<string, string>): void {
    // Apply to :root for light, and [data-theme="dark"] for dark
    // Use document.documentElement.style.setProperty()
  }

  applyEmotionColors(colors: Record<string, string>): void {
    // Set each as a CSS variable: --emotion-{name}
    // e.g. document.documentElement.style.setProperty('--emotion-anger', '#ff4757')
  }

  resetThemeColors(): { light: Record<string, string>, dark: Record<string, string> } {
    // Remove from localStorage, return defaults
  }

  resetEmotionColors(): Record<string, string> {
    // Remove from localStorage, return defaults
  }
}
```

### On app startup (in `app.component.ts`):
Inject `ColorSettingsService` and call `applyThemeColors()` and `applyEmotionColors()` with saved values (or defaults) so customizations persist across sessions.

---

## Default Values

```typescript
export const DEFAULT_LIGHT_COLORS: Record<string, string> = {
  '--color-bg': '#f8f9fc',
  '--color-surface': '#ffffff',
  '--color-border': '#e2e8f0',
  '--color-text': '#1a1a2e',
  '--color-text-muted': '#64748b',
  '--color-primary': '#6c63ff',
  '--color-accent': '#00d4aa',
};

export const DEFAULT_DARK_COLORS: Record<string, string> = {
  '--color-bg': '#0d0d14',
  '--color-surface': '#13131f',
  '--color-border': '#2a2a3d',
  '--color-text': '#e2e8f0',
  '--color-text-muted': '#64748b',
  '--color-primary': '#6c63ff',
  '--color-accent': '#00d4aa',
};

export const DEFAULT_EMOTION_COLORS: Record<string, string> = {
  anger:    '#ff4757',
  disgust:  '#a29bfe',
  fear:     '#fd9644',
  joy:      '#ffd32a',
  neutral:  '#778ca3',
  sadness:  '#4a90d9',
  surprise: '#00d4aa',
};
```

---

## Settings Page UI

### Section 1 — Theme Colors

Two tabs at the top of this section: **Light Mode** | **Dark Mode**

Each tab shows a list of color rows. One row per CSS variable:

| Label (readable) | Variable |
|---|---|
| Page Background | `--color-bg` |
| Card / Surface | `--color-surface` |
| Borders | `--color-border` |
| Primary Text | `--color-text` |
| Muted Text | `--color-text-muted` |
| Brand Primary | `--color-primary` |
| Accent | `--color-accent` |

### Section 2 — Emotion Colors

One row per emotion: Anger, Disgust, Fear, Joy, Neutral, Sadness, Surprise.

---

## Color Row UI (apply to both sections)

Each row contains:
1. **Label** — readable name (e.g. "Brand Primary", "Anger")
2. **Color swatch** — 32×32px rounded square showing the current color, clickable
3. **Hex input** — text input showing hex value, editable directly
4. **Preview** — small live preview of the swatch updates as user types a valid hex

Clicking the swatch opens a native `<input type="color">` (hidden, triggered via click).
Typing in hex input updates the swatch preview instantly.
Validation: only apply if value is a valid hex color (`/^#[0-9a-fA-F]{6}$/`).

---

## Save & Reset Buttons

At the bottom of each section:
- **Save Changes** button (brand primary) — calls `colorSettingsService.saveThemeColors()` or `saveEmotionColors()`, then calls the matching `apply...()` method to apply immediately
- **Reset to Default** button (ghost/secondary) — calls reset method, reapplies defaults, updates the form fields to show defaults

Show a small success toast/message after saving: "Colors saved successfully ✓"

---

## Styling Rules

- Use `var(--color-surface)`, `var(--color-border)`, `var(--color-text)` for all UI elements
- Section cards: same card style as the rest of the settings page
- Tabs (Light/Dark): styled toggle tabs, brand primary for active tab
- Color rows: flex layout, label on left, controls on right, border-bottom separator between rows
- Both light and dark mode must look clean and professional

---

## Files To Create / Modify

```
CREATE:
  src/app/core/services/color-settings.service.ts

MODIFY:
  src/app/features/settings/settings.component.ts  ← add the two sections
  src/app/app.component.ts                          ← apply saved colors on startup
```

---

## Output Requirements
- Zero TODOs, zero errors on `ng serve`
- Colors persist after page refresh
- Reset works correctly and reverts both UI and applied CSS variables
- The service is clean and ready to swap localStorage to API calls with minimal changes — add a comment in the service explaining this
- Both light and dark mode look great
