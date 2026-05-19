## 2024-05-14 - Admin Request Reports Filtering Performance Bottleneck
**Learning:** The previous implementation fetched all requests from the database into the Next.js API route, sent the entire JSON array over the network, and then filtered the data client-side for the PDF reports. This is a severe performance bottleneck for an expanding dataset, wasting database bandwidth, application memory, network bandwidth, and client processing power.
**Action:** Push data filtering down to the database whenever possible. I updated the `/api/requests` endpoint to accept optional `startDate` and `endDate` query parameters and pass them directly into Prisma's `where` clause. This ensures only the necessary data is queried, serialized, and transmitted.

## 2024-05-14 - Admin Request Reports Filtering Performance Bottleneck (Timezone Edge Case)
**Learning:** Initially filtering by pushing `new Date(YYYY-MM-DD)` to Prisma was shifting the local time string into an exact UTC timestamp for Prisma (`YYYY-MM-DDT00:00:00.000Z`). For a tool querying by logical day, this shifted boundary meant requests submitted around midnight in the local timezone might fall into the adjacent day incorrectly.
**Action:** When migrating client-side date logic to the backend, ensure the parsing explicitly accounts for or matches the expected timezone offset behavior.

## 2024-05-14 - SQLite Missing Foreign Key Indexes
**Learning:** SQLite does not automatically index foreign keys (unlike some other database engines). This means any queries that lookup relations or sort heavily by fields like `createdAt` can become slow table scans as the dataset grows. In `PartRequest` and `PhoneNumber` models, fields like `userId`, `phoneNumberId`, and `createdAt` were heavily queried and sorted in `src/app/api/requests/route.ts` but had no explicit indexes.
**Action:** When defining Prisma schemas with an SQLite provider, always explicitly add database indexes (`@@index`) for relation IDs (foreign keys) and frequently sorted fields. I've added these missing indexes to the `PartRequest` and `PhoneNumber` models to avoid O(n) scan performance bottlenecks.
