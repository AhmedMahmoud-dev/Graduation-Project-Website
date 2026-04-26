# Emotra — Agent Skills & Rules

## Project Stack

- Angular 20 — standalone components only, no NgModules, signals-based state
- TailwindCSS v4 — primary styling, plain CSS only when Tailwind cannot do it
- ngx-echarts + echarts — all charts and data visualization
- RxJS + Angular Signals — async and UI state
- FastAPI (Python) — AI microservices
- .NET Core — main backend (auth, data, orchestration)

---

## Absolute Rules — Never Violate

- NEVER delete any file or folder
- NEVER change styles unless that is specifically the task
- NEVER hardcode hex colors — always use CSS variables
- NEVER use NgModules
- NEVER use `*ngFor` or `*ngIf` — use `@for` and `@if` only
- NEVER add scroll animations or entrance animations
- NEVER change element size on hover (no transform, no scale)
- NEVER use inline templates or inline styles
- NEVER guess a fix — find the root cause first

---

## Before Writing Anything

- Always read the existing file(s) before making any changes
- Always reuse existing shared components — never rebuild what already exists
- Always check if a service or component exists before creating a new one
- Plan before implementing on any complex task

---

## Code Style

- Standalone components only — every component in its own folder: `.ts` + `.html` + `.css`
- `.css` file only if actually needed — skip if no custom styles
- Signal inputs for reactive child components
- All API URLs through `environment.ts`
- DRY is mandatory — extract repeated patterns, no duplicated markup or logic
- `@for` / `@if` control flow only — never `*ngFor` / `*ngIf`

---

## Styling Rules

- TailwindCSS first — plain CSS only when Tailwind cannot achieve it
- All colors via CSS variables — never hardcode hex values anywhere
- Emotion colors in CSS: `var(--emotion-name)`
- Emotion colors in charts: `ColorSettingsService.emotionColors()` — dynamic, respects user settings
- Allowed hover effects only: `background-color`, `border-color`, `color`, `opacity`
- Hover transition: `background-color 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease` — nothing else
- Active/press state: one step darker or more opaque than hover
- Both light and dark themes must always look intentional and polished
- Fully responsive on all screen sizes — mobile, tablet, desktop — mandatory

---

## CSS Variables Reference

Review styles.css.

---

## Shared Components — Reuse These

Review them before do anything.

---

## Services — Know These Before Creating New Ones

Review them before do anything.

---

## What Causes Frustration — Avoid These

- Guessing a fix without finding the root cause
- Multiple failed attempts on the same problem
- Changing things that were not part of the task
- Missing details in output that cause wrong results
- Side effects that touch unrelated parts of the app
