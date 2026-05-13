## 2024-05-13 - [Accessibility Form Labels]
**Learning:** React form inputs without matching `id` and `htmlFor` label attributes are inaccessible to screen readers and difficult to click for mouse users.
**Action:** Always verify that every form input field (such as `<input>` and `<select>`) has a unique `id` attribute that corresponds exactly to its associated `<label htmlFor="...">` tag. If dynamically toggling inputs, use conditional rendering safely while retaining semantic HTML.
