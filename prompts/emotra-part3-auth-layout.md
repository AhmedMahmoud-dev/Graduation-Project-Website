# Emotra — Part 3: Auth Pages + App Layout
## Prompt for AI Agent

---

## Context

You are a senior frontend developer continuing work on **Emotra** — a modern AI SaaS platform for emotion detection and timeline analysis.

The landing page is already built. The project has Angular (latest, standalone), TailwindCSS, a ThemeService, and a landing sidebar.

Your task in this part is:
1. Build the **Login page**
2. Build the **Register page**
3. Build the **App Layout** (the shell that appears after login — completely different from the landing page)
4. Build a **placeholder Dashboard page** (marked as Coming Soon)
5. Wire up routing correctly

---

## Important Philosophy

There are **two completely separate experiences** in this app:

### Experience 1 — Public (already built)
- Landing page with the marketing sidebar
- Anyone can see this

### Experience 2 — App (what you build now)
- Activated after login
- Completely different layout, different sidebar, different feel
- Like going from a marketing website into the actual product
- Think Notion, Linear, Vercel — when you log in, everything changes

These two experiences must never mix. They are separate layouts, separate components, separate shells.

---

## Technology Rules

- Angular (latest, standalone components, no NgModules)
- TailwindCSS as primary styling system
- Plain CSS allowed at any time
- No SCSS
- No UI component libraries — build everything from scratch
- Use the same CSS variables already defined in the project (the color palette is already set)

---

## Part 1 — Auth Pages (Login & Register)

### Layout Style: Split Screen

Both login and register pages use a **split screen layout**:

- **Left side (50%):** Emotra branding panel
- **Right side (50%):** The form
- On mobile: left side disappears, only the form is shown full screen

---

### Left Side — Branding Panel

The left side is the same for both login and register pages.

**Content (top to bottom):**
- Emotra logo (icon + "Emotra" text, large)
- Tagline: `"Understand your emotions over time."`
- Three feature highlights (icon + text each):
  1. `Analyze emotions from text, audio, image, and video`
  2. `Track how your emotions change over time`
  3. `Get intelligent alerts for emotional patterns`
- Bottom: subtle quote or statement — `"Your emotions tell a story. Emotra helps you read it."`

**Style:**
- Background: brand primary color (`#6c63ff`) as base with a subtle animated gradient (same slow gradient as the hero section — reuse the keyframes)
- Text: white
- Feature highlight icons: white, simple inline SVG
- Feels premium, not flat — use subtle depth

---

### Right Side — Login Form

**Header:**
- Title: `Welcome back`
- Subtitle: `Sign in to your Emotra account`

**Fields:**
1. Email address (type: email)
2. Password (type: password, with show/hide toggle)

**Below the fields:**
- Forgot password link (right aligned): `Forgot your password?` — links to `/auth/forgot-password` (placeholder page, just show "Coming Soon" if visited)

**Submit button:**
- Text: `Sign In`
- Full width, brand color, filled

**Divider:**
- A horizontal line with text `or` in the center

**Google button:**
- Text: `Continue with Google`
- Google icon (inline SVG)
- Outlined style
- Has a `Coming Soon` badge overlaid on it (slightly grayed out, cursor not-allowed)
- Tooltip on hover: `Google sign-in coming soon`

**Bottom link:**
- `Don't have an account?` + `Create one` (links to `/auth/register`)

---

### Right Side — Register Form

**Header:**
- Title: `Create your account`
- Subtitle: `Start understanding your emotions today`

**Fields (in this order):**
1. Full name (type: text)
2. Username (type: text)
3. Email address (type: email)
4. Password (type: password, with show/hide toggle)
5. Confirm password (type: password, with show/hide toggle)

**Validation rules (client-side, no API):**
- Full name: required, min 2 characters
- Username: required, min 3 characters, no spaces allowed
- Email: required, valid email format
- Password: required, min 8 characters
- Confirm password: must match password
- Show inline error messages under each field when invalid and touched
- Error messages must be styled in danger color (`var(--danger)` or red)

**Terms & Conditions checkbox:**
- `I agree to the Terms of Service and Privacy Policy`
- Both "Terms of Service" and "Privacy Policy" are links (placeholder, go to `#`)
- Register button is disabled unless checkbox is checked

**Submit button:**
- Text: `Create Account`
- Full width, brand color, filled
- Disabled state when form is invalid or terms not accepted

**Divider + Google button:** same as login (Coming Soon)

**Bottom link:**
- `Already have an account?` + `Sign in` (links to `/auth/login`)

---

### Form Behavior (Auth Service)

Create `core/services/auth.service.ts`:

**This service is built for the REAL API but uses mock behavior now.**

```typescript
// Structure it exactly like this so real API calls can be dropped in later
interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    email: string;
  };
}
```

**Methods:**
- `login(data: LoginRequest): Observable<AuthResponse>` — currently returns mock success after 1.5s delay (simulate API call)
- `register(data: RegisterRequest): Observable<AuthResponse>` — same mock behavior
- `logout(): void` — clears token and user from localStorage
- `isAuthenticated(): boolean` — checks if token exists in localStorage
- `getCurrentUser()` — returns current user from localStorage
- `saveAuth(response: AuthResponse): void` — saves token and user to localStorage

**Mock behavior:**
- Simulate a 1.5 second loading delay using `rxjs delay`
- Return a fake token and fake user object
- This will be replaced with real HTTP calls later — structure must make that replacement easy

**Loading state:**
- Both forms must show a loading spinner on the submit button while the mock API call is running
- Button text changes to a spinner animation during loading
- Form fields are disabled during loading

**After successful login:**
- Save mock auth to localStorage via `auth.service.saveAuth()`
- Show a brief success message: `"Welcome back! Redirecting..."` (green, inline, above the button)
- After 1.5 seconds redirect to `/dashboard`

**After successful register:**
- Same — show: `"Account created! Redirecting..."` then redirect to `/dashboard`

**Error handling:**
- If mock fails (you can add a 10% random failure chance to simulate errors)
- Show an error message above the submit button: `"Something went wrong. Please try again."` (red)

---

### Auth Guard

Update `core/guards/auth.guard.ts`:
- Check `auth.service.isAuthenticated()`
- If not authenticated: redirect to `/auth/login`
- If authenticated: allow access

---

### Auth Pages Design Details

**Form card (right side):**
- Max width: `460px`, centered vertically in the right panel
- Generous padding: `48px`
- No card border or shadow — the split screen itself is the container
- Background: `var(--bg-primary)`

**Input fields:**
- Height: `48px`
- Border: `1px solid var(--border-color)`
- Border radius: `10px`
- Background: `var(--bg-secondary)`
- On focus: border color changes to `var(--brand-primary)` with a subtle glow
- Smooth transition on focus (200ms)
- Full width

**Show/hide password toggle:**
- Eye icon inside the input field (right side)
- Inline SVG — open eye and closed eye
- Toggle between `type="password"` and `type="text"`

**Buttons:**
- Height: `48px`
- Border radius: `10px`
- Font weight: 600
- Smooth hover transition (200ms)

**Responsive:**
- Below 768px: left branding panel completely hidden, form takes full screen
- Form stays centered and readable on all screen sizes

---

## Part 2 — App Layout (After Login)

This is the most important part of this task. After login, the user enters a completely different experience.

### App Shell Structure

```
+------------------+------------------------------------------+
|                  |  TOP NAVBAR                              |
|   APP SIDEBAR    +------------------------------------------+
|                  |                                          |
|                  |   MAIN CONTENT (router-outlet)           |
|                  |                                          |
+------------------+------------------------------------------+
```

Create `layouts/app-layout/app-layout.component.ts`

This layout wraps all protected pages (Dashboard, Analysis, History, Alerts).

---

### App Sidebar

Create `layouts/app-layout/app-sidebar.component.ts`

This is a completely new sidebar — different from the landing sidebar. Professional, clean, app-grade.

**Dimensions:**
- Expanded: `260px`
- Collapsed: `72px`

**Structure (top to bottom):**

1. **Logo area:**
   - Expanded: Emotra icon + "Emotra" text
   - Collapsed: icon only
   - Always visible

2. **Toggle button:**
   - Always visible, inside sidebar boundary
   - Smooth arrow rotation animation on state change

3. **Navigation section label** (only visible when expanded):
   - Small uppercase label: `MAIN MENU`

4. **Nav items:**
   - Dashboard (icon: grid/home)
   - Analysis (icon: brain/waveform)
   - History (icon: clock/history)
   - Alerts (icon: bell)
   - Each item: icon + label (label hidden when collapsed)
   - Active state: brand color background (subtle), brand color icon and text
   - Hover state: subtle background highlight
   - Tooltip showing the label on hover when sidebar is collapsed

5. **Bottom section:**
   - Divider line
   - Settings link (icon: gear)
   - User profile area:
     - Expanded: avatar circle (initials) + name + email (truncated)
     - Collapsed: avatar circle only
   - Logout button (icon: logout arrow, text "Logout" when expanded)

**Style:**
- Background: `var(--bg-surface)`
- Right border: `1px solid var(--border-color)`
- Fully adapts to light and dark mode via CSS variables
- All icons: inline SVG
- Smooth width animation: `transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1)`
- Nav labels fade out smoothly on collapse

**Responsive:**
- Desktop (≥1024px): always visible, collapsible, starts expanded
- Mobile (<1024px): hidden by default, overlay on toggle with dark backdrop

---

### Top Navbar

Create `layouts/app-layout/app-navbar.component.ts`

**Height:** `64px`
**Position:** fixed top, spans the content area (not over the sidebar)
**Background:** `var(--bg-surface)` with bottom border `var(--border-color)`
**Backdrop blur:** subtle blur effect

**Left side:**
- Current page title (dynamic — changes based on active route)
- Example: "Dashboard", "Analysis", "History", "Alerts"

**Right side (left to right):**
- Theme toggle button (light / dark / system) — small, icon-based, clean
- Notification bell icon — just UI, badge with number `3` for now
- Divider
- User avatar (circle with initials) + user name
- Dropdown arrow
- Clicking the avatar/name opens a small dropdown menu:
  - `My Profile` (placeholder)
  - `Settings` (placeholder)
  - Divider
  - `Logout` (calls auth.service.logout() then redirects to `/`)

**Style:**
- Clean, minimal, professional
- Smooth dropdown animation
- Fully adapts to light and dark mode

---

### Dashboard Page (Placeholder)

Create `features/dashboard/dashboard.component.ts`

This page is a placeholder. The real dashboard will be built later.

**Content:**
- Large centered "Coming Soon" display
- Emotra logo above it
- Title: `Dashboard`
- Subtitle: `Your emotion analytics dashboard is coming soon. The foundation is ready.`
- A subtle animated pulse or glow effect on the coming soon badge
- A button: `Analyze Something` — links to `/analysis` (also placeholder for now)

**Style:**
- Uses the app layout (sidebar + navbar)
- Clean, centered, professional — not a boring placeholder
- Matches the theme

---

## Routing Update

Update `app.routes.ts` to reflect the full structure:

```
/                        → AuthLayout  → LandingComponent
/auth/login              → AuthLayout  → LoginComponent
/auth/register           → AuthLayout  → RegisterComponent
/auth/forgot-password    → AuthLayout  → ForgotPasswordComponent (just "Coming Soon")
/dashboard               → AppLayout   → DashboardComponent  [AuthGuard]
/analysis                → AppLayout   → AnalysisComponent placeholder [AuthGuard]
/history                 → AppLayout   → HistoryComponent placeholder [AuthGuard]
/alerts                  → AppLayout   → AlertsComponent placeholder [AuthGuard]
**                       → redirect to /
```

All routes under AppLayout must be children of a parent route that applies the AppLayout component.

---

## Folder Structure for This Part

```
src/app/
  core/
    services/
      auth.service.ts        ← NEW
      theme.service.ts       ← EXISTS
    guards/
      auth.guard.ts          ← UPDATE

  layouts/
    app-layout/
      app-layout.component.ts     ← NEW
      app-sidebar.component.ts    ← NEW
      app-navbar.component.ts     ← NEW

  features/
    auth/
      login/
        login.component.ts        ← NEW
      register/
        register.component.ts     ← NEW
      forgot-password/
        forgot-password.component.ts ← NEW (Coming Soon page)
    dashboard/
      dashboard.component.ts      ← NEW (Coming Soon placeholder)
```

---

## Output Requirements

- Every file complete, no TODOs, no placeholders in code
- Auth service structured cleanly so real API calls can replace mock with minimal changes
- Forms must have full client-side validation with visible error messages
- Loading states must work during mock API delay
- Success and error messages must display correctly
- App layout sidebar and navbar must be fully functional and beautiful on first run
- Light mode and dark mode must both look intentionally designed
- Sidebar animations must be smooth
- Responsive behavior must work correctly
- No errors, no warnings on `ng serve`
