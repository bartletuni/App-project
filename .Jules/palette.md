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
## 2024-07-07 - Add Keyboard Focus Rings to CTA Links
**Learning:** By default, highly-customized buttons and links built with Tailwind CSS may lose standard browser focus rings, leaving keyboard users with no visual indicator of where they are tabbing on the page. Missing focus indicators on primary calls-to-action is a critical accessibility failure.
**Action:** Always add explicit keyboard focus indicators (e.g., `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 rounded-sm`) to all interactive elements, especially complex anchor links (`<Link>`) functioning as buttons, to ensure WCAG compliance.
