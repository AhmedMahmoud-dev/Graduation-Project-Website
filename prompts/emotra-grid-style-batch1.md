# Emotra Task: Connected Grid Border System (Landing - Features Section)

## Context

You are a senior Angular 20 developer working on **Emotra**, a modern AI SaaS platform.

Strict rules:

- Angular 20 (standalone components only, NO NgModules)
- TailwindCSS v4 (primary styling)
- Plain CSS only (no SCSS)
- No UI component libraries
- Clean architecture:
  - Services → `core/services/`
  - Models → `core/models/`
  - Environment variables only for API URLs

---

## The Goal

We want to implement a **Connected Grid Border System** for the landing page.

This is a **UI layout system**, NOT a background effect.

The design should feel like:

- cards connected together in a grid
- shared borders between items
- clean, minimal, modern SaaS (similar to TailwindCSS layout style)

---

## Scope Limitation (CRITICAL)

ONLY work on the **Features Section** of the landing page.

File to read and modify:
`src/app/features/landing/features-section.component.ts`

DO NOT modify:

- Hero section
- Other landing sections
- Global styles (unless absolutely necessary)

---

## Design Requirements

### 1. Connected Grid Layout

- Cards must appear as part of a **single grid system**
- Borders must be **shared**, not duplicated
- No spacing gaps between cards
- Avoid "card floating" look

### 2. Borders

- Use thin, subtle borders (Tailwind-style)
- Example feel:
  - `border-gray-800` (dark mode)
  - `border-gray-200` (light mode)

- No heavy shadows

### 3. Grid Behavior

- Responsive grid:
  - Desktop: multi-column (e.g. 3 or 4 columns)
  - Tablet: fewer columns
  - Mobile: stacked

- Borders must remain visually connected across breakpoints

### 4. Visual Style

- Clean SaaS aesthetic
- Slight hover effect (optional):
  - background tint OR
  - subtle highlight

- NO heavy animations

### 5. Theming

- Must support light/dark mode using ThemeService
- Colors must adapt automatically

---

## Implementation Strategy

You MUST:

1. Read the existing `features-section.component.ts`
2. Refactor layout into a proper grid container
3. Ensure borders are shared:
   - avoid double borders
   - use techniques like:
     - removing inner borders
     - or using parent grid border system

4. Keep code clean and reusable

---

## Technical Requirements

- Use Tailwind utilities as much as possible
- Minimal custom CSS (only if necessary)
- No inline styles unless justified
- Maintain accessibility and semantic HTML

---

## Output Format

1. Brief plan of approach
2. Updated `features-section.component.ts`
3. Any additional CSS (if needed)
4. Short explanation of how the connected borders are achieved

---

## Important Notes

- This is NOT a decorative background
- This is a structural UI system
- Think: “one unified grid surface” instead of separate cards
- Keep it minimal, elegant, and consistent with modern SaaS design
