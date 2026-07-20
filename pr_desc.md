## 🛡️ Sentinel: [MEDIUM] Fix missing input length limits on file uploads

### 🚨 Severity
MEDIUM

### 💡 Vulnerability
The API routes processing `multipart/form-data` uploads (`/api/requests`, `/api/admin/materials`, `/api/admin/materials/[id]`) did not enforce length limits on parsed fields like `file.name` and the `material` name.

### 🎯 Impact
A malicious user could submit a request with an excessively long `file.name` or `material` string. This could lead to:
1.  **Denial of Service (DoS):** High memory consumption parsing the massive string.
2.  **Database Exhaustion:** Attempting to store strings larger than expected column types or index sizes.
3.  **Application Crashes:** Upstream file storage services or internal parsing operations potentially failing unexpectedly.

### 🔧 Fix
Added strict length validation checks for unbounded string inputs before processing the files:
- Enforced a maximum of `255` characters for `file.name` across all upload routes.
- Enforced a maximum of `100` characters for the `material` name in the requests route.
- Returns a secure `400 Bad Request` with a generic message if these limits are exceeded, preventing further processing.

### ✅ Verification
1.  Run the test suite (`npx jest`) to ensure no regressions.
2.  Attempt to upload a file with a `file.name` exceeding 255 characters (e.g., using Postman or `curl`) to either the `/api/requests` or `/api/admin/materials` endpoint. The API should safely reject the request with a `400 Bad Request` and the message `"File name exceeds maximum allowed length"`.
