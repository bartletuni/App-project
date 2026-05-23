## 2024-05-14 - Admin Request Reports Filtering Performance Bottleneck
**Learning:** The previous implementation fetched all requests from the database into the Next.js API route, sent the entire JSON array over the network, and then filtered the data client-side for the PDF reports. This is a severe performance bottleneck for an expanding dataset, wasting database bandwidth, application memory, network bandwidth, and client processing power.
**Action:** Push data filtering down to the database whenever possible. I updated the `/api/requests` endpoint to accept optional `startDate` and `endDate` query parameters and pass them directly into Prisma's `where` clause. This ensures only the necessary data is queried, serialized, and transmitted.

## 2024-05-14 - Admin Request Reports Filtering Performance Bottleneck (Timezone Edge Case)
**Learning:** Initially filtering by pushing `new Date(YYYY-MM-DD)` to Prisma was shifting the local time string into an exact UTC timestamp for Prisma (`YYYY-MM-DDT00:00:00.000Z`). For a tool querying by logical day, this shifted boundary meant requests submitted around midnight in the local timezone might fall into the adjacent day incorrectly.
**Action:** When migrating client-side date logic to the backend, ensure the parsing explicitly accounts for or matches the expected timezone offset behavior.

## 2024-05-23 - Prisma include stripping regression
**Learning:** I attempted to strip an unused `include` block in a non-admin backend query to save network payload size and reduce join overhead. This violated API consistency. Because frontend clients often reuse data-fetching hooks (e.g. `req.user.name` in a dashboard list), removing relations breaks the API contract and causes runtime application crashes.
**Action:** Do not remove relational fields or `include` statements from existing API endpoints if they are consumed by a shared UI component or without comprehensively auditing all consumers. Rely on Prisma schema indexes instead for safe, non-breaking database optimizations.
