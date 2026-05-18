## 2024-05-18 - Added Database Indexes for Frequently Queried Fields
**Learning:** Found missing database indexes on `userId` and `createdAt` in the `PartRequest` table, which are heavily used in the API's sorting and filtering for the dashboard lists.
**Action:** Always verify if Prisma models used in common GET requests have indexes on their relation IDs and sort fields to prevent full table scans and improve query latency.
