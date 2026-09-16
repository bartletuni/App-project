💡 What: Added `aria-hidden="true"` to decorative and state-based SVG icons across admin action buttons and empty states (Add Request, Reports, Admin Dashboard).
🎯 Why: Screen readers were redundantly announcing SVG code/icons inside buttons that already have clear text labels (e.g., "Submit Request", "Export PDF", "View Order"), causing a confusing and verbose experience for users relying on assistive technologies.
📸 Before/After: Visuals remain entirely unchanged, as the change is purely semantic/structural for screen readers.
♿ Accessibility: Improved screen reader clarity by explicitly hiding non-informative vector graphics from the accessibility tree, conforming to WCAG principles for text alternatives and hidden content.
