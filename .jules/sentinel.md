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

## 2026-07-25 - Fix Unbounded Queries DoS Vulnerability on /api/requests
**Vulnerability:** The API route for fetching part requests (`/api/requests`) was querying the database using `findMany` without any constraints or pagination logic, causing the server to fetch and return all records in a single array.
**Learning:** Returning all records from an unbounded table query introduces a Denial of Service (DoS) vulnerability via memory and CPU exhaustion. As the `partRequest` table grows over time, this endpoint could crash the application or database.
**Prevention:** Always implement pagination logic and cap incoming limit parameters against a hard upper bound (e.g., `take: Math.min(parsedLimit, 100)`) on all endpoints that retrieve collections from the database.

## 2024-05-27 - Case-sensitive Email Vulnerability
**Vulnerability:** The authentication and registration flows treated emails as case-sensitive, meaning `Test@example.com` and `test@example.com` were treated as distinct accounts.
**Learning:** This can lead to account duplication or confusion vulnerabilities, where users might accidentally create multiple accounts with the same email in different cases, or attackers might try to hijack/confuse an existing account by registering a similarly-cased email.
**Prevention:** Always normalize (lowercase) email addresses during registration and login flows.

## 2024-05-27 - Missing Authentication on Admin Endpoint
**Vulnerability:** The `GET` handler in `/api/admin/materials/route.ts` lacked an authentication/authorization check, exposing administrative data to unauthenticated users.
**Learning:** Even if `POST`, `PATCH`, and `DELETE` handlers in an admin route are properly secured, the `GET` handler might be overlooked, leading to an Information Disclosure vulnerability.
**Prevention:** Always verify that *every* exported HTTP method handler in administrative or sensitive routes implements the required `getServerSession` and authorization checks before executing any database operations or returning data.
