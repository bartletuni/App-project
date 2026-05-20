## 2024-05-13 - [Accessibility Form Labels]
**Learning:** React form inputs without matching `id` and `htmlFor` label attributes are inaccessible to screen readers and difficult to click for mouse users.
**Action:** Always verify that every form input field (such as `<input>` and `<select>`) has a unique `id` attribute that corresponds exactly to its associated `<label htmlFor="...">` tag. If dynamically toggling inputs, use conditional rendering safely while retaining semantic HTML.

## 2026-05-14 - Semantic Navigation Links
**Learning:** Using `<div onClick={...}>` for navigation elements removes them from the tab sequence, hides them from screen readers, and prevents standard link interactions (like right-click or middle-click). Even if styling makes it look clickable, it remains functionally inaccessible.
**Action:** Always use semantic `<Link>` or `<a>` tags for navigation elements with explicit `href` attributes. Ensure they include visual focus indicators (e.g., `focus-visible:ring-2`) for keyboard users.

## 2024-05-15 - [Accessible Icon-Only Buttons]
**Learning:** Icon-only modal close buttons without `aria-label` or focus styles are inaccessible to screen readers and difficult to navigate for keyboard users.
**Action:** Always add an explicit `aria-label`, a `title` tooltip, and a `focus-visible:ring-2` focus indicator state with a subtle hover background to icon-only buttons to ensure they are fully accessible and discoverable.

## 2024-05-20 - [Accessible Responsive Navigation Links]
**Learning:** Responsively hiding link text (e.g., "Dashboard", "Support") using Tailwind's `hidden` classes (like `hidden md:inline`) while leaving only an icon visible causes the link to become an unlabelled icon for screen reader users on mobile devices. Furthermore, these links often lack visible focus indicators for keyboard navigation.
**Action:** Always add explicit `aria-label` attributes to navigation links containing icons when text is hidden responsively. Ensure robust keyboard accessibility by applying focus styles such as `focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none rounded-md px-1.5 py-1` to these elements.
