## 2026-07-23 - Fix Type Confusion in FormData parsing
**Vulnerability:** API routes handling `FormData` implicitly cast extracted values to `string | null` (using `as string | null`) without verifying if the underlying value was actually a string or a `File` object.
**Learning:** `formData.get()` can return a `File` object. If an attacker submits a file payload for a field expected to be a string (e.g., `notes` or `material`), the `.length` check evaluates as `undefined`, bypassing the length limit validation and potentially leading to Type Confusion or Denial of Service (DoS) during subsequent database operations.
**Prevention:** Always perform explicit runtime type validation (`typeof value === 'string'`) on `FormData` values before asserting them as strings or attempting string-specific methods like `.length`.

## 2025-02-14 - Fix missing input length limits on file uploads
**Vulnerability:** The API routes handling file uploads did not enforce length limits on `file.name` and the `material` strings parsed from `multipart/form-data`.
**Learning:** These inputs, if maliciously crafted to be extremely long strings, could bypass previous validations, potentially causing Denial of Service (DoS) due to high memory consumption and triggering string processing/database exhaustion errors during payload parsing or storage.
**Prevention:** Always explicitly validate the string length of *all* unbounded inputs, including multipart boundaries and uploaded file metadata (e.g., `file.name`), *before* continuing to process the request payload. Enforce sensible maximum lengths.

## 2024-05-27 - Implement Pagination on /api/admin/users
**Vulnerability:** Denial of Service (DoS) via memory exhaustion due to unbounded database queries fetching all users.
**Learning:** Returning all records from a database table without limits or pagination can easily be exploited by attackers to crash the server or degrade performance as the dataset grows.
**Prevention:** Always implement pagination on collection endpoints, and enforce a hard upper limit (e.g., `Math.min(parsedLimit, 100)`) on the number of records returned per request.
