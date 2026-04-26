# Emotra — Landing Page

## Prompt for AI Agent

---

## Who You Are

You are a senior frontend developer and UI designer. You are building the landing page for **Emotra** — a modern AI SaaS platform for emotion detection and timeline analysis.

You are starting from a **completely empty folder**. There is no existing project, no framework installed, nothing. You will set up everything from scratch and deliver a fully working, visually stunning landing page.

You have **full creative and technical freedom**. You may create any additional files, components, utilities, assets, animations, or helper scripts you judge necessary to make the result exceptional. The folder structure below is a starting point — extend it freely.

---

## What Emotra Is

Emotra is an AI-powered web platform that detects human emotions from text, audio, image, and video. The core innovation is an **emotion timeline** — instead of returning a single static emotion, the system tracks how emotions evolve over time. It is a modern, production-level AI SaaS product.

---

## Your Task

Build the **complete landing page** for Emotra. This includes:

- Setting up the Angular project from scratch
- Installing and configuring all dependencies
- Building the full landing page with all sections
- Supporting light and dark mode
- Making it fully responsive
- Delivering every file complete and ready to run

---

## Technology Stack

- **Angular** (latest stable version, standalone components)
- **TailwindCSS** (latest stable version, primary styling system)
- Plain **CSS** is allowed at any time — no restrictions
- Do **NOT** use SCSS

---

## Project Setup Requirements

- Standalone components only — no NgModules anywhere
- Strict TypeScript
- Routing enabled
- TailwindCSS configured with dark mode using:

```js
darkMode: ["class", '[data-theme="dark"]'];
```

- Import **Syne** (weights 400–800) and **DM Sans** (weights 300–600) from Google Fonts in `index.html`
- Set **DM Sans** as the default body font globally
- Use **Syne** for all headings (`h1`–`h4`) and the logo wordmark

---

## Folder Structure

Create the following structure (extend freely with any additional files you need):

```
src/app/
  core/
    services/
      theme.service.ts
  features/
    landing/
      landing.ts
      landing-sidebar.ts
      hero-section.ts
      features-section.ts
      how-it-works-section.ts
      pricing-section.ts
      footer-section.ts
```

Feel free to add shared utilities, animation helpers, scroll services, or any other files that improve the quality of the result.

---

## Theme Service

Create `core/services/theme.ts`:

- Signal-based state: `currentTheme` typed as `'light' | 'dark' | 'system'`
- Method: `setTheme(theme: 'light' | 'dark' | 'system')`
- On init: read from `localStorage`, apply to `document.documentElement` as `data-theme` attribute
- Persist to `localStorage` on every change
- Handle system mode by listening to `prefers-color-scheme` media query
- Expose computed signal `resolvedTheme` returning `'light'` or `'dark'` even in system mode

---

## Color Palette (CSS Variables)

Define all colors as CSS variables in the global stylesheet.

**Light mode (`:root`):**

```css
--bg-primary: #ffffff;
--bg-secondary: #f8f9fc;
--bg-surface: #f0f0fa;
--bg-card: #ffffff;
--text-primary: #0f0f0f;
--text-secondary: #5a5a72;
--text-muted: #9090a8;
--border-color: #e4e4f0;
--brand-primary: #6c63ff;
--brand-hover: #574fd6;
--accent: #00d4aa;
--accent-hover: #00b896;
--shadow: 0 2px 16px rgba(108, 99, 255, 0.08);
--shadow-hover: 0 8px 32px rgba(108, 99, 255, 0.16);
```

**Dark mode (`[data-theme="dark"]`):**

```css
--bg-primary: #0d0d14;
--bg-secondary: #0d0d14;
--bg-surface: #13131f;
--bg-card: #1a1a2e;
--text-primary: #f0f0ff;
--text-secondary: #9090b0;
--text-muted: #5a5a72;
--border-color: #2a2a3d;
--brand-primary: #6c63ff;
--brand-hover: #7b74ff;
--accent: #00d4aa;
--accent-hover: #00efc2;
--shadow: 0 2px 16px rgba(0, 0, 0, 0.4);
--shadow-hover: 0 8px 32px rgba(108, 99, 255, 0.24);
```

Feel free to modify any colors, if you see it good, just add it, modify anything you want in the color palette, just make it good.

---

## App Routing

```
/   →  LandingComponent
```

---

## Navigation — Sidebar

The landing page uses a **vertical sidebar** on the left — no top navigation bar.

### Two States

- **Expanded:** `240px` wide — shows logo icon + wordmark "Emotra" + nav labels
- **Collapsed:** `64px` wide — shows logo icon only + icon-only nav

### Rules

- Toggle button is always visible in both states
- Logo is always visible in both states
- Toggle button stays inside the sidebar boundary — never floats outside
- Sidebar is fixed to the left, full viewport height
- Background: `var(--bg-surface)` with a right border `var(--border-color)`

### Animation

- Width: `transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1)`
- Nav labels: fade out with `opacity` and `width` transition when collapsing
- Main content left margin animates in sync with sidebar width — no layout jump

### Sidebar Contents (top to bottom)

1. **Logo area** — custom inline SVG brain/wave icon + wordmark "Emotra" in Syne font (hidden when collapsed)
2. **Toggle button** — chevron arrow SVG that rotates 180° on state change, always inside sidebar
3. **Nav links** (smooth scroll to section on click):
   - Features
   - How It Works
   - Pricing
4. **Bottom area:**
   - Login button (ghost style)
   - Get Started button (accent color `var(--accent)`, filled, stands out visually)

### Responsive

- **Desktop (≥1024px):** sidebar always present, collapsible, starts expanded
- **Mobile (<1024px):** sidebar hidden by default, opens as overlay on toggle, semi-transparent dark backdrop behind it, close on backdrop click

---

## Landing Page Sections

Build in this exact order:

---

### 1. Hero Section

Full viewport height. Visually stunning. This is the first thing users see.

**Content:**

- Badge label: `AI-Powered Emotion Intelligence`
- Heading: `Understand How Emotions Change Over Time`
- Subheading: `Emotra analyzes emotions from text, audio, image, and video — and shows you not just what you feel, but how your emotions evolve.`
- Button 1 (primary, filled, brand color `var(--brand-primary)`): `Get Started Free`
- Button 2 (outlined, secondary): `See How It Works` — smooth scrolls to How It Works section

**Background:**

- Animated gradient using CSS `@keyframes`
- Light mode: slow moving soft pastel gradient between purple and teal tones
- Dark mode: dark base with two glowing blurred blob/orb elements (low opacity, brand + accent colors)
- Animation must be slow and subtle — not distracting

**Decorative Element:**

- Below or beside the text content, render an **animated SVG emotion wave** — a multi-line sine-wave chart that slowly animates, suggesting an emotion timeline. Use inline SVG with CSS animations. Each wave line should be a different brand/accent color at low opacity. This is purely decorative but should feel purposeful and on-brand.

**Layout:**

- Content centered horizontally and vertically
- Generous padding

---

### 2. Features Section

**Heading:** `Everything You Need to Understand Emotions`
**Subheading:** `One platform. Four input types. Infinite emotional insight.`

**4 Cards:**

| Title          | Icon                     | Description                                                                                   |
| -------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| Text Analysis  | Document/lines icon      | Analyze emotions sentence by sentence. See how the emotional tone shifts across your writing. |
| Audio Analysis | Waveform/sound-bars icon | Upload voice recordings and detect emotional changes across time segments.                    |
| Image Analysis | Face/portrait icon       | Detect facial emotions from images with high accuracy using deep learning models.             |
| Video Analysis | Play/film-strip icon     | Frame-by-frame emotional analysis of video content with a full emotion timeline.              |

**Card style:**

- Background: `var(--bg-card)`
- Border: `1px solid var(--border-color)`
- Border radius: `16px`
- Icon: drawn as a unique, expressive inline SVG — brand color, top of card. Do NOT use generic clip-art shapes; draw distinctive, characterful icons.
- Title: bold, `var(--text-primary)`, Syne font
- Description: `var(--text-secondary)`, DM Sans
- Hover: `translateY(-4px)` + `var(--shadow-hover)`, duration 200ms ease

---

### 3. How It Works Section

**Heading:** `How Emotra Works`
**Subheading:** `Three simple steps to emotional clarity.`

**3 Steps:**

1. **Upload Your Input** — Choose text, audio, image, or video. Upload directly or paste your content.
2. **AI Analyzes Emotions** — Our AI models process your input and extract emotion data with confidence scores.
3. **Explore the Timeline** — View your emotion timeline, track changes, and gain deep insight into emotional patterns.

**Style:**

- Large decorative step number in brand color (large, light weight, Syne font)
- Steps connected by a horizontal dotted or gradient divider line on desktop
- Vertical stack on mobile
- Clean and minimal

---

### 4. Pricing Section

**Heading:** `Simple and Transparent`
**Subheading:** `Start for free. No credit card required.`

**Free Card:**

- Label: `Free`
- Price: `$0` with period label `/ forever`
- Features: 10 analyses per day, Text and image analysis, Basic emotion timeline, 7-day history
- Button: `Get Started Free` (brand color, filled)

**Pro Card:**

- Label: `Pro`
- Badge: `Coming Soon` (styled pill, accent color)
- Price: `$19` with period label `/ month` — overlaid with a subtle "Coming Soon" blur/lock treatment so users understand it's not available yet
- Features: Unlimited analyses, All input types, Full emotion timeline, Unlimited history, Priority processing, Alert system
- Button: `Join Waitlist` (outlined, brand color border)
- Style: brand color border, subtle glow effect, feels premium

---

### 5. Footer

**Left:** Logo (icon + "Emotra" in Syne) + tagline: `Understand your emotions over time.`

**Right:** Links — Features, How It Works, Pricing, Login, Register

**Bottom bar:**

- `© 2025 Emotra. All rights reserved.`
- Theme toggle (light / dark / system) — small segmented control, subtle

---

## Animations

### Fade In on Scroll

- Every section fades in when entering the viewport
- Use `IntersectionObserver` — no animation libraries
- From: `opacity: 0; transform: translateY(20px)`
- To: `opacity: 1; transform: translateY(0)`
- Duration: `600ms`, easing: `ease-out`
- Stagger child elements within a section for a polished cascade effect

### Hover Effects

- Buttons: background color transition, `200ms`
- Cards: `translateY(-4px)` + shadow increase, `200ms`
- Nav links: color transition, `200ms`

### Hero Gradient

- CSS `@keyframes` animated gradient
- Slow, subtle — do not distract from content

### Hero Wave SVG

- CSS `@keyframes` animating the SVG path `d` attribute or `transform: translateX` for a scrolling wave effect
- Subtle loop, ~8–12s duration

---

## Responsive Rules

- Mobile first
- Feature cards: 1 col mobile, 2 col tablet, 4 col desktop
- How It Works: vertical mobile, horizontal desktop
- Pricing cards: stacked mobile, side by side desktop
- No horizontal scroll at any screen size
- Sidebar becomes overlay on mobile

---

## Output Requirements

- Provide every file with full, complete content
- No TODOs, no placeholders, no "add your content here"
- Every file must work immediately with zero modifications
- Run `ng serve` and the page must look stunning
- Light mode and dark mode must both look intentionally designed and beautiful
- Sidebar must animate perfectly on first run
- Scroll animations must work on first run
- No console errors, no TypeScript errors, no warnings

---

## Definition of Done

Before finishing, self-check against this list:

- [ ] `ng serve` runs with zero errors and zero warnings
- [ ] Light mode looks polished and intentional
- [ ] Dark mode looks polished and intentional
- [ ] Sidebar expands and collapses smoothly
- [ ] Mobile sidebar opens as overlay and closes on backdrop click
- [ ] All scroll-to-section links work
- [ ] IntersectionObserver fade-in works on all sections
- [ ] Hero animated gradient plays on load
- [ ] Hero decorative wave SVG animates
- [ ] All 4 feature card icons are unique inline SVGs
- [ ] Pricing "Coming Soon" treatment is clear and visually handled
- [ ] Footer theme toggle cycles through light / dark / system correctly
- [ ] No horizontal overflow at any viewport width
- [ ] Fonts (Syne + DM Sans) load and apply correctly

# at the end, if anything in the style need to be change, do it...
