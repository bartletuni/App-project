## 2024-06-25 - Form Accessibility

**Learning:** Forms require proper linkage between `label` elements and `input` elements using `htmlFor` and `id` attributes. This enables screen readers to accurately identify fields, and makes fields easier to click. Without this, inputs fail fundamental accessibility standards.

**Action:** Consistently apply `htmlFor` and `id` tags in forms or add `aria-label` / screen-reader only classes (`sr-only`) on labels when direct visual placement isn't desired. Ensure ID's are dynamic when dealing with repeated components to avoid duplication. Ensure no temporary files created during string manipulation remain in the workspace.
## 2026-06-26 - Add aria-current to navigation
**Learning:** Screen readers need context for active elements in navigation structures. Simply relying on visual cues (like an underline or active styling) is not enough for accessibility.
**Action:** Always conditionally append `aria-current="page"` on routing Links to ensure proper semantic structure.
## 2024-06-27 - Custom File Input Keyboard Focus
**Learning:** When creating custom styled file upload inputs by hiding the default `<input type="file">` with `.sr-only` and styling the adjacent `<label>`, keyboard users lose visual focus indication entirely, making the form inaccessible via Tab navigation.
**Action:** Use Tailwind's `peer` pattern. Place the hidden `<input class="sr-only peer">` immediately *before* the `<label>`, and apply `peer-focus-visible:ring-2 peer-focus-visible:ring-clay-500` classes to the label so a focus ring appears when the hidden input receives keyboard focus.
