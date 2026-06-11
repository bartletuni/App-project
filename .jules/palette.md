## 2024-05-13 - [Accessibility Form Labels]
**Learning:** React form inputs without matching `id` and `htmlFor` label attributes are inaccessible to screen readers and difficult to click for mouse users.
**Action:** Always verify that every form input field (such as `<input>` and `<select>`) has a unique `id` attribute that corresponds exactly to its associated `<label htmlFor="...">` tag. If dynamically toggling inputs, use conditional rendering safely while retaining semantic HTML.

## 2026-05-14 - Semantic Navigation Links
**Learning:** Using `<div onClick={...}>` for navigation elements removes them from the tab sequence, hides them from screen readers, and prevents standard link interactions (like right-click or middle-click). Even if styling makes it look clickable, it remains functionally inaccessible.
**Action:** Always use semantic `<Link>` or `<a>` tags for navigation elements with explicit `href` attributes. Ensure they include visual focus indicators (e.g., `focus-visible:ring-2`) for keyboard users.

## 2024-05-15 - [Accessible Icon-Only Buttons]
**Learning:** Icon-only modal close buttons without `aria-label` or focus styles are inaccessible to screen readers and difficult to navigate for keyboard users.
**Action:** Always add an explicit `aria-label`, a `title` tooltip, and a `focus-visible:ring-2` focus indicator state with a subtle hover background to icon-only buttons to ensure they are fully accessible and discoverable.
## 2024-06-03 - Accessible Show/Hide Password Toggle
**Learning:** Adding a show/hide password toggle significantly improves login/signup UX, but requires careful accessibility implementation. It must use a `button` with `type="button"` to avoid form submission, have a dynamic `aria-label` ("Show password" / "Hide password") based on state, and utilize padding on the input (`pr-12`) to prevent the password text from visually overlapping the absolutely positioned toggle icon.
**Action:** When implementing password inputs, always include an accessible show/hide toggle utilizing Lucide icons (`Eye`/`EyeOff`) and dynamic `aria-label`s to reduce user friction during authentication.
## 2024-06-04 - Accessible Visually Hidden Containers
**Learning:** When using CSS to visually hide elements until they are hovered (e.g., `opacity-0 group-hover:opacity-100`), these elements remain in the tab sequence and receive focus, but are invisible, leading to a confusing experience for keyboard users.
**Action:** Always include `focus-within:opacity-100` on the parent container alongside `group-hover:opacity-100` so that any interactive child elements become visible when receiving keyboard focus. Furthermore, explicitly ensure those interactive child elements have clear focus states (e.g., `focus-visible:ring-2`).
## 2024-06-05 - Accessible Form Requirements and Constraints
**Learning:** Using placeholder text or inconsistent plain-text labels like "(Required)" can lead to a cluttered interface and may not be consistently read by screen readers. Conversely, failing to explicitly mark required fields or constraints (like max file sizes) causes validation frustration.
**Action:** Always mark required fields with a standardized, visually distinct, but screen-reader-hidden asterisk (`<span className="text-red-500" aria-hidden="true">*</span>`). Constraints and optional indicators should be explicitly stated in the label text using lighter font weights (e.g., `<span className="text-gray-400 font-normal ml-1">(Optional)</span>`) to improve visual hierarchy and scannability while maintaining screen reader compatibility.

## 2024-05-18 - Interactive Backgrounds / Use framer-motion / Convert to transparent layouts
**Learning:** Hardcoded white backgrounds (`bg-white`) block global interactive background components from being visible.
**Action:** When implementing global background effects, ensure page layouts and components use transparent or glassmorphic (`bg-white/60 backdrop-blur-xl`) styling to allow the effect to render properly without breaking contrast.
