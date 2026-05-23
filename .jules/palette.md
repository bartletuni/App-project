## 2024-05-13 - [Accessibility Form Labels]
**Learning:** React form inputs without matching `id` and `htmlFor` label attributes are inaccessible to screen readers and difficult to click for mouse users.
**Action:** Always verify that every form input field (such as `<input>` and `<select>`) has a unique `id` attribute that corresponds exactly to its associated `<label htmlFor="...">` tag. If dynamically toggling inputs, use conditional rendering safely while retaining semantic HTML.

## 2026-05-14 - Semantic Navigation Links
**Learning:** Using `<div onClick={...}>` for navigation elements removes them from the tab sequence, hides them from screen readers, and prevents standard link interactions (like right-click or middle-click). Even if styling makes it look clickable, it remains functionally inaccessible.
**Action:** Always use semantic `<Link>` or `<a>` tags for navigation elements with explicit `href` attributes. Ensure they include visual focus indicators (e.g., `focus-visible:ring-2`) for keyboard users.

## 2024-05-15 - [Accessible Icon-Only Buttons]
**Learning:** Icon-only modal close buttons without `aria-label` or focus styles are inaccessible to screen readers and difficult to navigate for keyboard users.
**Action:** Always add an explicit `aria-label`, a `title` tooltip, and a `focus-visible:ring-2` focus indicator state with a subtle hover background to icon-only buttons to ensure they are fully accessible and discoverable.

## 2024-05-16 - [Accessible Hover Actions]
**Learning:** Action buttons that are hidden by default and only visible on hover (e.g., `opacity-0 group-hover:opacity-100`) become invisible to keyboard users who navigate via the Tab key, creating an accessibility barrier.
**Action:** Always include `focus-within:opacity-100` on the parent container when implementing hover-reveal patterns, and ensure the interactive elements themselves have clear focus indicators (e.g., `focus-visible:ring-2`) so keyboard users can discover and interact with them.
