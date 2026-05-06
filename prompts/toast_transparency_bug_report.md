# Bug Report: Toast Background Transparency Conflict with Modals

**Status:** UNRESOLVED

## Problem Description
In an Angular application using Tailwind CSS, toasts become "fully transparent" (losing their background color and blur effect) whenever a modal or any overlay with its own `backdrop-blur` is active. While the toasts are correctly positioned above the modals (`z-index: 10001`), the background color `bg-[color:var(--color-surface)]/80` fails to render, leaving only text, icons, and borders visible.

## Current Implementation
- **Toast Container:** `fixed inset-0 z-[10001] pointer-events-none overflow-hidden isolate`
- **Toast Item:**
  ```html
  class="pointer-events-auto w-full flex-shrink-0 bg-[color:var(--color-surface)]/80 backdrop-blur-md backdrop-saturate-150 border border-[color:var(--color-border)] border-l-4 rounded-[1.25rem] shadow-2xl overflow-hidden transition-all duration-300 relative flex flex-col transform-gpu translate-z-0"
  ```
- **Modal Backdrop (Underneath):** Usually `fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm`

## Failed Attempts
1.  **Z-Index Adjustment:** Successfully moved the toast above the modal, but the background transparency remained broken.
2.  **Solid Background:** Switching to a solid `100%` opacity background fixed visibility but was rejected as it removed the required "glass" aesthetic.
3.  **Stacking Context Isolation:** Adding `isolation: isolate` to the container was intended to prevent filter conflicts but did not solve the issue.
4.  **Hardware Acceleration:** Adding `transform: translateZ(0)` (via `transform-gpu`) to the toast items did not force the expected rendering behavior.

## Core Issue
It appears to be a browser rendering limitation (likely Chromium-related) where multiple overlapping layers of `backdrop-filter` cause the top-most layer to lose its background-color Alpha channel or fail to composite correctly.

## Goal
Fix the rendering so the toast maintains its `80%` opacity background and `backdrop-blur` while positioned over another blurred element. **The glass effect must be preserved.**
