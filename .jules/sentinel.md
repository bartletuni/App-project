## 2025-02-14 - Fix missing input length limits on file uploads
**Vulnerability:** The API routes handling file uploads did not enforce length limits on `file.name` and the `material` strings parsed from `multipart/form-data`.
**Learning:** These inputs, if maliciously crafted to be extremely long strings, could bypass previous validations, potentially causing Denial of Service (DoS) due to high memory consumption and triggering string processing/database exhaustion errors during payload parsing or storage.
**Prevention:** Always explicitly validate the string length of *all* unbounded inputs, including multipart boundaries and uploaded file metadata (e.g., `file.name`), *before* continuing to process the request payload. Enforce sensible maximum lengths.
