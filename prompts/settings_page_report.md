# Settings Page: Current Implementation Report

## Overview
The current Settings page is built using a modular, tab-based architecture. It utilizes a segmented navigation bar in the header to switch between different settings categories.

## UI/UX Structure

### 1. Layout & Header
- **Container:** A full-height flex container (`min-h-screen`) with a smooth background color transition.
- **Header Section:** Uses a shared `app-page-header` component.
- **Navigation Placement:** The navigation bar is embedded directly within the header's navigation slot, keeping it pinned to the top of the page.

### 2. Segmented Navigation
- **Component:** `app-segmented-nav`
- **Logic:** Managed by a Signal (`activeMainTab`) which tracks the current category.
- **Persistence:** The last active tab is saved in `sessionStorage`, ensuring the user returns to the same section upon refresh.
- **Dynamic Options:**
    - **Regular Users:** Have access to all tabs (Appearance, Account, Shared Links, Alerts, Notifications, Support).
    - **Admins:** Filtered view containing only "Appearance & Colors" and "Notifications".

### 3. Navigation Tabs
The following sections are currently available:
- **Appearance & Colors (`colors`):** Customizes theme and emotion-specific color mappings.
- **Account (`account`):** Manages user profile and password settings.
- **Shared Links (`shared`):** Lists and manages generated sharing URLs.
- **Alerts (`alerts`):** Configures threshold-based system alerts.
- **Notifications (`notifications`):** Toggles platform/email notification preferences.
- **Support (`support`):** Provides a contact form for user assistance.

### 4. Content Switching Mechanism
- **Implementation:** Uses Angular's control flow (`@if`) to conditionally render the specific component for each tab.
- **Components:** Each tab corresponds to a dedicated component located in `src/app/features/settings/components/`.
- **Feedback:** Some components emit events (e.g., `settingsChanged`, `passwordChanged`) that trigger a global success toast.

## Technical Details
- **Main Files:** 
    - `src/app/features/settings/settings.component.ts` (Logic)
    - `src/app/features/settings/app-settings.html` (Template)
- **Styling:** Driven by Tailwind CSS with custom CSS variables (e.g., `var(--color-bg)`) for theme support.
- **Constraints:** Navigation is responsive, switching from full-width on mobile to intrinsic width on larger screens (`w-full lg:w-max`).

---
*This report was generated to assist in the planned redesign of the Settings page style.*
