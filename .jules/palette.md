## 2024-06-25 - Form Accessibility

**Learning:** Forms require proper linkage between `label` elements and `input` elements using `htmlFor` and `id` attributes. This enables screen readers to accurately identify fields, and makes fields easier to click. Without this, inputs fail fundamental accessibility standards.
## 2026-06-26 - Add aria-current to navigation
**Learning:** Screen readers need context for active elements in navigation structures. Simply relying on visual cues (like an underline or active styling) is not enough for accessibility.
**Action:** Always conditionally append `aria-current="page"` on routing Links to ensure proper semantic structure.
## 2024-06-29 - Explicit Focus Indicators for Keyboard Users
**Learning:** Default browser focus outlines often fail to provide sufficient contrast on dark themes, making keyboard navigation difficult or invisible for interactive elements like navigation links and icon buttons.
**Action:** Always explicitly define custom focus styles (e.g. `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500`) on interactive elements to ensure high-contrast, theme-consistent focus indicators for keyboard users.
## 2026-07-05 - Added Async Feedback to Dashboard Action Buttons
**Learning:** Users lack confidence when critical destructive actions (like canceling a request) have no immediate UI feedback, especially if the API call is slow.
**Action:** Always wrap destructive or state-changing action buttons with an inline loading spinner and disable them during the fetch lifecycle to prevent duplicate submissions and provide immediate feedback.
## 2024-07-13 - Async Feedback & Keyboard Focus in Admin Tables
**Learning:** Destructive actions in data tables (like deleting a user) often lack immediate UI feedback and keyboard focus styles, leading to uncertain user interactions and poor accessibility for keyboard users.
**Action:** Always wrap destructive actions with an inline loading spinner and disable them during the fetch lifecycle. Additionally, ensure all table action buttons include high-contrast `focus-visible` ring styles.
## 2024-07-28 - Avoid Dead-End Empty States
**Learning:** Empty states without a clear call to action act as dead-ends, confusing users on how to proceed. Including a contextual CTA dramatically improves navigability.
**Action:** Always provide a relevant Call-to-Action (like "Return Home" or "Create New") when rendering an empty state index or data view.
## 2026-09-28 - Small Muted Text and Solid Clay Buttons Need a Floor
**Learning:** On the espresso ground, `cream-600` measures 5.2:1 — a technical pass, but at the 9–10px uppercase mono sizes it is used for it reads as nearly invisible, and translucent accents (`clay-500/70` step numbers at 3.2:1) fade out entirely. Cream text on a `clay-600` fill is 4.2:1, which fails WCAG AA for the 11–12px labels every solid button carries.
**Action:** Use `cream-500` (7.4:1) or lighter for any text under 14px, and full-strength clay (`clay-400` and up) rather than an opacity-reduced one for text. Solid clay buttons rest on `clay-700` (5.9:1) and hover to `clay-800` (7.9:1) — never lighter, so no state drops below AA. Check a page by measuring text against the rendered background, particles and gradients included, not against the palette alone.
