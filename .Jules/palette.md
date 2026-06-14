## 2025-05-18 - Hidden Action Buttons on Touch Devices
**Learning:** Hiding essential action buttons (like edit and delete) using `opacity-0` with a `group-hover:opacity-100` reveal pattern completely breaks usability on touch devices (mobile/tablet) because they cannot trigger a hover state. As a result, users cannot see or interact with these controls.
**Action:** When using hover-to-reveal patterns for secondary actions, always use responsive classes (e.g., `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`) to ensure the controls remain persistently visible on touch devices, or adopt alternative patterns like "swipe to reveal" or an explicit "More options" (kebab) menu.

## 2026-06-14 - Focus Indicators on Navbar Links
**Learning:** Navigation links inside a responsive layout might lose their implicit focus states when styled with Tailwind CSS, particularly if `outline-none` or similar resets are used. Keyboard users might tab through the Navbar without knowing where their focus is.
**Action:** Add explicit `focus-visible:ring-2` or similar focus indicators to all interactive elements, especially primary navigation links and sign out buttons.
