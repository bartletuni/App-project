## 2026-07-23 - Fix Type Confusion in FormData parsing
**Vulnerability:** API routes handling `FormData` implicitly cast extracted values to `string | null` (using `as string | null`) without verifying if the underlying value was actually a string or a `File` object.
**Learning:** `formData.get()` can return a `File` object. If an attacker submits a file payload for a field expected to be a string (e.g., `notes` or `material`), the `.length` check evaluates as `undefined`, bypassing the length limit validation and potentially leading to Type Confusion or Denial of Service (DoS) during subsequent database operations.
**Prevention:** Always perform explicit runtime type validation (`typeof value === 'string'`) on `FormData` values before asserting them as strings or attempting string-specific methods like `.length`.

## 2025-02-14 - Fix missing input length limits on file uploads
**Vulnerability:** The API routes handling file uploads did not enforce length limits on `file.name` and the `material` strings parsed from `multipart/form-data`.
**Learning:** These inputs, if maliciously crafted to be extremely long strings, could bypass previous validations, potentially causing Denial of Service (DoS) due to high memory consumption and triggering string processing/database exhaustion errors during payload parsing or storage.
**Prevention:** Always explicitly validate the string length of *all* unbounded inputs, including multipart boundaries and uploaded file metadata (e.g., `file.name`), *before* continuing to process the request payload. Enforce sensible maximum lengths.

## 2025-02-17 - Missing rate limiting / pagination on materials endpoint
**Vulnerability:** The `/api/materials` endpoint was returning all material records simultaneously because it lacked pagination or rate limiting. An attacker could exploit this by making numerous requests, leading to unbounded resource consumption (Denial of Service - DoS) and potentially exhausting database connections or server memory.
**Learning:** Returning unbounded datasets from a database via an API endpoint is a common DoS vector. Even if the current dataset is small, endpoints must be designed defensively to handle future growth and malicious abuse.
**Prevention:** Always implement pagination (e.g., using `take` and `skip` in Prisma) or explicit rate limiting on endpoints that return lists of records. Enforce a hard maximum limit on the server side to prevent clients from requesting an excessive number of records at once, and provide sensible defaults to maintain backward compatibility.
