## 🚨 Severity
HIGH

## 💡 Vulnerability
The `/api/requests` endpoint created `new Date(dateNeededStr)` (and `startDate`, `endDate`) directly from user input without validation. If an attacker provided an unparseable or malicious date string, JavaScript instantiated an 'Invalid Date' object. When this invalid date was subsequently passed to Prisma in database queries, it triggered an unhandled exception, causing the backend to crash with a 500 Internal Server Error, creating a Denial of Service (DoS) vector.

## 🎯 Impact
An attacker could cause application crashes and potential resource exhaustion by repeatedly hitting endpoints with malformed date strings, disrupting service for legitimate users.

## 🔧 Fix
Added explicit validation utilizing `isNaN(date.getTime())` after instantiating `Date` objects from user input. This ensures only valid dates are passed to Prisma, gracefully rejecting invalid payloads with a 400 Bad Request.

## ✅ Verification
- Run `pnpm test` to ensure existing API tests pass.
- Send a request to `/api/requests` with `dateNeeded=invalid_date` and verify it correctly returns a 400 Bad Request instead of crashing.
