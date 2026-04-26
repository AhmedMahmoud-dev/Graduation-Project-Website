# Emotra — Auth Pages Redesign (Login & Register)

## Prompt for AI Agent

---

## Context

You are a senior frontend developer working on **Emotra**.

The login and register pages already exist but need a **complete visual redesign**. Do not keep anything from the old design. Replace it entirely.

The new design must be the kind that makes someone stop and say "wow" the moment they see it. Think Raycast, Vercel, Linear — premium, immersive, unforgettable.

---

## Technology Rules

- Angular (latest, standalone components, no NgModules)
- TailwindCSS as primary styling system
- Plain CSS allowed at any time — no restrictions
- No SCSS
- No UI component libraries — build everything from scratch
- Keep all existing form logic, validation, AuthService, and routing completely intact
- This is a **visual redesign only** — do not touch any logic

---

## The New Design Concept

### Overall Layout

- Full page immersive design — no split screen, no panels
- The entire page is one dramatic scene
- A **particle network canvas** covers the full background (animated, always running)
- The **form floats in the center** as a glassmorphism card
- Nothing else on the page — just the particles, the card, and the Emotra branding above the form

### Background — Particle Network

Implement a **canvas-based particle network** using vanilla JavaScript:

**Particle behavior:**

- 80 particles on desktop, 40 on mobile
- Each particle is a small dot (radius 1.5–2.5px)
- Particles move slowly in random directions (speed: 0.3–0.8)
- When two particles are within 120px of each other, draw a line between them
- Line opacity fades based on distance — closer = more opaque
- Particles bounce off the edges of the canvas
- Canvas resizes with the window

**Colors:**

- Dark mode (default): particle color `rgba(108, 99, 255, 0.6)` (brand purple), line color `rgba(108, 99, 255, 0.15)`
- Light mode: particle color `rgba(108, 99, 255, 0.4)`, line color `rgba(108, 99, 255, 0.1)`
- Background in dark mode: `#0d0d14`
- Background in light mode: `#f0f0fa`

**Mouse interaction:**

- When the mouse moves over the canvas, particles within 150px are gently pushed away
- Subtle, smooth — not aggressive

**Implementation:**

- Use `<canvas>` element positioned `fixed`, `z-index: 0`, full width and height
- Use `requestAnimationFrame` for the animation loop
- Initialize in `ngAfterViewInit`, destroy in `ngOnDestroy`
- Must be a reusable Angular standalone component: `shared/components/particle-background/particle-background.component.ts`

---

### The Form Card — Glassmorphism

The form sits in a centered card on top of the canvas.

**Card style:**

- Position: centered both horizontally and vertically (`position: fixed`, `top: 50%`, `left: 50%`, `transform: translate(-50%, -50%)`)
- Width: `440px` on desktop, `90vw` on mobile
- Max height: `90vh` with `overflow-y: auto` and custom scrollbar
- Background:
  - Dark mode: `rgba(13, 13, 20, 0.75)`
  - Light mode: `rgba(255, 255, 255, 0.75)`
- `backdrop-filter: blur(24px) saturate(180%)`
- `-webkit-backdrop-filter: blur(24px) saturate(180%)`
- Border: `1px solid rgba(108, 99, 255, 0.25)`
- Border radius: `24px`
- Box shadow:
  - Dark mode: `0 0 0 1px rgba(108, 99, 255, 0.1), 0 32px 64px rgba(0, 0, 0, 0.4), 0 0 80px rgba(108, 99, 255, 0.08)`
  - Light mode: `0 0 0 1px rgba(108, 99, 255, 0.15), 0 32px 64px rgba(108, 99, 255, 0.1)`
- Padding: `48px 40px`
- `z-index: 10`

**Card entrance animation:**

- When the page loads, the card fades in and slides up slightly
- From: `opacity: 0; transform: translate(-50%, calc(-50% + 24px))`
- To: `opacity: 1; transform: translate(-50%, -50%)`
- Duration: `600ms`, easing: `cubic-bezier(0.16, 1, 0.3, 1)`

---

### Card Header (above the form)

At the top of the card, before the form fields:

- Emotra logo: centered, icon + "Emotra" text, medium size
- Below the logo: a thin divider line (`1px solid var(--border-color)`)
- Page title:
  - Login: `"Welcome back"`
  - Register: `"Create your account"`
- Subtitle:
  - Login: `"Sign in to continue to Emotra"`
  - Register: `"Start understanding your emotions today"`
- All centered

---

### Form Fields — Redesigned

**Input fields:**

- Height: `52px`
- Background:
  - Dark mode: `rgba(255, 255, 255, 0.05)`
  - Light mode: `rgba(0, 0, 0, 0.04)`
- Border: `1px solid var(--border-color)`
- Border radius: `12px`
- Font size: `15px`
- Padding: `0 16px`
- On focus:
  - Border color: `var(--brand-primary)`
  - Background slightly brightens
  - Subtle glow: `box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.15)`
  - Transition: `200ms`
- Full width
- Color: `var(--text-primary)`
- Placeholder color: `var(--text-muted)`

**Labels:**

- Above each field
- Font size: `13px`
- Font weight: `500`
- Color: `var(--text-secondary)`
- Margin bottom: `8px`

**Show/hide password toggle:**

- Eye icon (inline SVG) inside the field, right side
- Smooth icon swap animation
- Color: `var(--text-muted)`, hover: `var(--brand-primary)`

**Error messages:**

- Below the field
- Font size: `12px`
- Color: `#ff4757`
- Fade in animation when appearing

**Field spacing:** `20px` between each field group

---

### Submit Button — Redesigned

- Height: `52px`
- Full width
- Border radius: `12px`
- Background: gradient — `linear-gradient(135deg, #6c63ff 0%, #00d4aa 100%)`
- Text: white, font weight `600`, font size `15px`
- Box shadow: `0 4px 24px rgba(108, 99, 255, 0.4)`
- Hover:
  - Background shifts slightly: `linear-gradient(135deg, #574fd6 0%, #00b896 100%)`
  - Shadow intensifies: `0 8px 32px rgba(108, 99, 255, 0.5)`
  - Transform: `translateY(-1px)`
  - Transition: `200ms`
- Active: `translateY(0)`, shadow reduces
- Loading state:
  - Shows a spinning circle animation inside the button
  - Text hidden during loading
  - Button disabled, opacity `0.8`
- Disabled state (register form, terms not accepted): opacity `0.5`, cursor not-allowed, no hover effects

---

### Divider

Between the submit button and Google button:

```
————————  or  ————————
```

- Line color: `var(--border-color)`
- Text: `var(--text-muted)`, font size `13px`

---

### Google Button — Redesigned

- Height: `52px`
- Full width
- Border radius: `12px`
- Background:
  - Dark mode: `rgba(255, 255, 255, 0.05)`
  - Light mode: `rgba(0, 0, 0, 0.04)`
- Border: `1px solid var(--border-color)`
- Text: `var(--text-primary)`, font weight `500`
- Google SVG icon on the left
- Relative positioned container
- **Coming Soon overlay:**
  - A semi-transparent overlay covers the button
  - A small pill badge in the top-right corner: `Coming Soon` (brand color background, white text, font size `10px`)
  - `cursor: not-allowed`
  - `pointer-events: none` on the button itself
  - On hover over the container: show a tooltip `"Google sign-in coming soon"` — styled pill tooltip appearing above

---

### Terms Checkbox (Register only)

- Custom styled checkbox — not the default browser checkbox
- A `16px` square with `border-radius: 4px`
- Unchecked: `border: 2px solid var(--border-color)`
- Checked: background `var(--brand-primary)`, white checkmark SVG inside
- Smooth check animation (scale in)
- Text: `13px`, `var(--text-secondary)`
- Links ("Terms of Service", "Privacy Policy"): brand color, underline on hover

---

### Bottom Navigation Link

- Login page: `"Don't have an account?"` + `"Create one"` link → `/auth/register`
- Register page: `"Already have an account?"` + `"Sign in"` link → `/auth/login`
- Centered below everything
- Font size: `14px`
- Link: brand color, subtle underline on hover

---

### Success & Error Messages

**Success message** (after submit):

- Appears above the submit button
- Background: `rgba(0, 212, 170, 0.1)` (accent green tint)
- Border: `1px solid rgba(0, 212, 170, 0.3)`
- Border radius: `10px`
- Text: accent color
- Padding: `12px 16px`
- Font size: `14px`
- Fade in animation

**Error message:**

- Same style but red tint:
- Background: `rgba(255, 71, 87, 0.1)`
- Border: `1px solid rgba(255, 71, 87, 0.3)`
- Text: `#ff4757`

---

## Forgot Password Page

The `/auth/forgot-password` route shows a minimal Coming Soon page — same design (particles background + glass card):

- Card content: Emotra logo + `"Forgot Password"` title + `"This feature is coming soon."` subtitle + a back button to `/auth/login`

---

## Responsive Design

- On mobile (below 768px):
  - Card width: `90vw`
  - Card padding: `32px 24px`
  - Particle count reduced to 40
  - All elements scale down gracefully
  - No horizontal scroll

---

## Critical Rules

- Keep ALL existing form logic, validation, AuthService calls, and routing — do not change anything functional
- This is purely a visual replacement
- The `ParticleBackgroundComponent` must be reusable — both login and register use it
- The canvas must be properly destroyed when the component is destroyed (`ngOnDestroy`) to prevent memory leaks
- Dark mode and light mode must both look stunning — not just dark mode
- The glassmorphism effect must work properly — `backdrop-filter` must actually blur the particles behind the card
- No errors, no warnings on `ng serve`

---

## Output Requirements

- Every file complete, no TODOs
- The page must be jaw-dropping on first run
- Particle animation must be smooth (60fps)
- Card entrance animation must be smooth
- Form interactions must feel premium (focus glow, button hover, error animations)
- Both light and dark mode must look intentionally designed and stunning
