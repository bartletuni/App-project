## 2025-05-25 - Focus-within for visually hidden hover states
**Learning:** When using `opacity-0 group-hover:opacity-100` to hide secondary actions (like edit/delete buttons in a list), keyboard users cannot see the buttons when they tab to them, creating a severe accessibility issue where interactive elements are focused but invisible.
**Action:** Always pair `group-hover:opacity-100` with `focus-within:opacity-100` on the parent container (or `focus:opacity-100` on the elements themselves) so the actions become visible when navigated to via keyboard.
