## 2025-05-18 - Hidden Action Buttons on Touch Devices
**Learning:** Hiding essential action buttons (like edit and delete) using `opacity-0` with a `group-hover:opacity-100` reveal pattern completely breaks usability on touch devices (mobile/tablet) because they cannot trigger a hover state. As a result, users cannot see or interact with these controls.
**Action:** When using hover-to-reveal patterns for secondary actions, always use responsive classes (e.g., `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`) to ensure the controls remain persistently visible on touch devices, or adopt alternative patterns like "swipe to reveal" or an explicit "More options" (kebab) menu.

## 2026-06-14 - Focus Indicators on Navbar Links
**Learning:** Navigation links inside a responsive layout might lose their implicit focus states when styled with Tailwind CSS, particularly if `outline-none` or similar resets are used. Keyboard users might tab through the Navbar without knowing where their focus is.
**Action:** Add explicit `focus-visible:ring-2` or similar focus indicators to all interactive elements, especially primary navigation links and sign out buttons.

## 2025-06-16 - Actionable Empty States
**Learning:** Empty states that simply say "No data found" leave users stranded and increase cognitive load, as they have to manually figure out how to populate the list. Providing a clear Call-to-Action (CTA) within the empty state itself significantly improves user onboarding.
**Action:** Always include a relevant helper text and a primary action button (e.g., "Add First Material" or "Start a Request") inside empty states to guide users directly to the next logical step. Ensure any decorative icons used in these states are marked with `aria-hidden="true"`.

## 2025-06-28 - Custom File Upload Focus States
**Learning:** Custom styled file upload buttons that use a visually hidden `<input type="file" className="sr-only">` coupled with a `<label>` lose their keyboard focus indicator. Users navigating via Tab key cannot see when the file upload is focused.
**Action:** Place the hidden `<input className="sr-only">` immediately *before* its custom visual `<label>` and apply Tailwind's `peer` class to the input. Then, use `peer-focus-visible` classes (e.g., `peer-focus-visible:ring-2`) on the label to provide a clear, visible focus indicator for keyboard users.
