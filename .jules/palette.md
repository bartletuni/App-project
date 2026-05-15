## 2024-05-13 - [Accessibility Form Labels]
**Learning:** React form inputs without matching `id` and `htmlFor` label attributes are inaccessible to screen readers and difficult to click for mouse users.
**Action:** Always verify that every form input field (such as `<input>` and `<select>`) has a unique `id` attribute that corresponds exactly to its associated `<label htmlFor="...">` tag. If dynamically toggling inputs, use conditional rendering safely while retaining semantic HTML.

## 2026-05-14 - Semantic Navigation Links
**Learning:** Using `<div onClick={...}>` for navigation elements removes them from the tab sequence, hides them from screen readers, and prevents standard link interactions (like right-click or middle-click). Even if styling makes it look clickable, it remains functionally inaccessible.
**Action:** Always use semantic `<Link>` or `<a>` tags for navigation elements with explicit `href` attributes. Ensure they include visual focus indicators (e.g., `focus-visible:ring-2`) for keyboard users.
## 2024-05-15 - ARIA Labels for Icon-Only Buttons
**Learning:** Icon-only buttons (using components like `Edit2`, `Trash2`, `Check`, `X`) in the application often rely solely on visual cues or `title` attributes. While `title` attributes provide visual tooltips, they are not always reliably announced by screen readers, which rely heavily on `aria-label`.
**Action:** Always verify icon-only buttons have explicit `aria-label` attributes to ensure full screen reader accessibility. If a `title` attribute is present for sighted users, pair it with an `aria-label` for assistive technologies.
