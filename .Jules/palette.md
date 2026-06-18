## 2024-05-18 - Inline Form Validation
**Learning:** For file upload inputs, users can easily select files exceeding server limits. Standard HTML file inputs do not provide immediate feedback if a file is too large before submission.
**Action:** When working with file uploads, proactively validate file size on the `onChange` event, explicitly announce the error using `aria-invalid` and `aria-describedby` linked to an accessible alert role element, and disable the form submission button to prevent unnecessary network requests.
