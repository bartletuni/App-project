# TakomoCo Request Management App

A web-based request management system for additive manufacturing custom parts.

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_secure_random_string_here" # Generate one using: openssl rand -base64 32

# Email (Resend)
RESEND_API_KEY="re_..."              # If unset, all notification emails are skipped
ADMIN_EMAIL="info@takomoco.com"      # Receives new-user and new-request notifications
EMAIL_FROM="TakomoCo <noreply@takomoco.com>" # Sender; must be on a domain verified in Resend
```

### Email notifications

Transactional email is sent through [Resend](https://resend.com). Two emails go out when a
user registers: a notification to `ADMIN_EMAIL` and a welcome email to the new user. A third
goes to `ADMIN_EMAIL` when a part request is submitted. Templates live in
`src/lib/email-templates.ts`.

Sends are best-effort — a failure is logged to the server console and never blocks
registration or request creation, so check the logs if an expected email does not arrive.

`EMAIL_FROM` defaults to `TakomoCo <onboarding@resend.dev>`, Resend's shared sandbox sender.
That sender can only deliver to the address that owns the Resend account, so before pointing
`ADMIN_EMAIL` at a company mailbox, verify `takomoco.com` under Domains in the Resend
dashboard, add the DNS records it lists, and set `EMAIL_FROM` to an address on that domain.

### 2. Initialize the Database
Install dependencies and sync the Prisma schema with your local SQLite database:
`npm install`
`npx prisma db push`

### 3. Admin Access Setup
The first time you log in, an account is automatically created. To make yourself an admin so you can view the Admin Dashboard:
1. Log in via the web interface.
2. Open Prisma Studio:
`npx prisma studio`
3. Find your user record and check the `isAdmin` boolean to `true`. Save the change.

### 4. Run the Application
Start the development server using your package manager run scripts.

Open `http://localhost:3000` in your browser.

## Pricing Page

The public service catalog lives at `/pricing` and is edited by admins at `/admin/pricing`
(Console → Rates). Page copy, contact details, and every service section and line item are
stored in the database and editable in the browser; "Defaults" restores the built-in TakomoCo
catalog.

Until an admin saves, the page serves the built-in catalog, so `/pricing` renders even on a
fresh database. Saving requires the pricing tables, so run `npx prisma db push` after deploying
this change.

Per-gram material rates are intentionally not on this sheet — material cost is carried by each
material record in the stock index (`/admin/materials`).

## Requesting a Quote

"Request a quote" buttons on the public site (masthead, hero, workflow, rate sheet,
stock index, contact, footer) all point at the composer with `?quote=1`. The composer's
"Quote" checkbox is off by default, and only that link pre-ticks it, for that visit —
submitting clears it again. Signing in on the way keeps the destination, so a visitor who
clicks a quote button while logged out still lands on a pre-ticked form.

The flag is stored on each request as `PartRequest.quoteRequested`, shown as a badge in the
build ledger and the admin console, and called out in the new-request email. Run
`npx prisma db push` after deploying this change so the column exists.

## Submitting a Part Without an STL or ZIP

The composer opens on **"What are we making?"** with two lanes:

- **I have a 3D file** — the original path, unchanged. Upload an `.stl` or `.zip`
  (20MB), get the 3D preview, submit.
- **No file yet** — for a customer who has a broken part but no model. They name
  the part, describe it, optionally give rough dimensions, and attach up to 5
  reference photos or drawings (JPG, PNG, WEBP, GIF, HEIC, PDF; 10MB each). HEIC
  is accepted because it is what an iPhone hands over; it uploads fine but shows
  a glyph rather than an inline preview, since browsers will not draw it.

Switching lanes keeps whatever has already been entered, so looking at the other
one never costs a customer their work.

A described part is **always quoted first** — there is nothing to price until the
model exists. The composer ticks and locks its Quote checkbox and says why, and
`POST /api/requests` forces the same flag regardless of what the client sends.

The same two lanes are on the admin console's "Add part request" form, so the
shop can file a phoned-in or walked-in job the same way.

### How it is stored

`PartRequest.submissionType` is `MODEL` or `DESCRIPTION`. `fileId` and `fileName`
are now nullable and are null on a described part; `partName`, `partDescription`,
and `dimensions` carry it instead. Reference files live in the new
`RequestAttachment` table (cascade-deleted with their request) and are served
through `/api/download/[fileId]`, which authorizes them against the owning
request just as it does the model file.

Lists, the review modals, the report PDF, and the new-request email all fall back
to the part name when there is no file name (`requestTitle` in
`src/lib/part-source.ts`). The admin email for a described part is subject-lined
`New Request (no model): …` and leads with the description, the size, and the
reference count.

Run the migration below so the new columns and the `RequestAttachment` table
exist.

### Applying this to Turso

The change is additive and backward-compatible — the currently deployed code
never reads the new columns, and every one is nullable or defaulted — so it is
safe to migrate **before** deploying the new code, and safe to run against live
data.

Back up first:

```bash
turso db shell YOUR_DB .dump > backup.sql
```

Then apply the migration:

```bash
TURSO_DATABASE_URL="libsql://YOUR_DB.turso.io" \
TURSO_AUTH_TOKEN="YOUR_TOKEN" \
node scripts/migrate-turso.mjs prisma/migrations/2026-add-description-requests.sql
```

`node migrate-turso.mjs` prompts for both values and does the same thing. The
script reports the tables it created and the row counts afterwards, so a silent
no-op is obvious. Running it twice is safe: it fails on its first statement,
before `PartRequest` is touched, and says the migration is already applied.

**`npx prisma db push` does not work against Turso here.** The Prisma CLI
validates the datasource URL against the schema's provider, and
`provider = "sqlite"` only accepts a `file:` URL — a `libsql://` host is
rejected with `P1013: The scheme is not recognized in database URL` before
anything runs. Prisma 7.8's config has no driver-adapter hook for migrate/push,
so the CLI cannot reach Turso at all. This does not affect the application,
which goes through `PrismaLibSql` at runtime; `scripts/migrate-turso.mjs` uses
that same client. Use `prisma db push` only against a local `file:` database.

SQLite cannot relax a `NOT NULL` constraint in place, so `PartRequest` is
rebuilt — new table, copy rows, drop, rename. Existing rows are preserved and
backfilled to `submissionType = 'MODEL'`. The statements must run in order on
one connection, which is why the file is applied whole rather than pasted in
piecemeal.

To apply it by hand instead, the SQL is committed at
`prisma/migrations/2026-add-description-requests.sql` and can be fed to the
Turso shell in one go:

```bash
turso db shell YOUR_DB < prisma/migrations/2026-add-description-requests.sql
```

Verify afterwards:

```bash
turso db shell YOUR_DB "SELECT submissionType, COUNT(*) FROM PartRequest GROUP BY submissionType;"
turso db shell YOUR_DB "SELECT COUNT(*) FROM RequestAttachment;"
```

### Validation

Limits and messages live in `src/lib/part-source.ts` and are shared by both forms
and the API, so the client and the server never disagree. Uploads are content-
sniffed in `src/lib/file-signatures.ts` — an extension is only a claim, and a
file whose leading bytes contradict its name is rejected before it reaches R2.

## Submission Failures

Both request forms report every failed submission. The banner sits at the top of
a long form, so `useFormAlert` (`src/components/ui/useFormAlert.ts`) scrolls it
into view and moves focus to it on every raise — including the same error twice
in a row — and the message is repeated beside the submit button that was just
pressed. Before this, a failure rendered off-screen and looked like nothing had
happened.

`readSubmitError` (`src/lib/submit-error.ts`) turns any failed response into
something actionable. It prefers the API's own `{ error }` body and falls back
to the status when there is no JSON to read at all:

- **413** — the host rejected the upload before the route ran. Note that Vercel
  caps a serverless function's request body at roughly 4.5MB, below the 20MB the
  upload field advertises, so a large STL fails here rather than in our code.
- **401 / 403** — expired session, or no permission.
- **408 / 504** — the server took too long.
- **5xx / 4xx with no JSON** — named by status, and clear that nothing was saved.

`describeSubmitException` covers a `fetch` that never returned at all (offline,
dropped connection), replacing browser jargon like "Failed to fetch". Every
message either function produces is non-empty, so a failure can never render as
a blank banner.
