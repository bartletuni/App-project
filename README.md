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

# Cloudflare Turnstile (OPTIONAL) — the public quote form's bot check.
# Leave both unset and the form still works, defended by the other layers.
# Set BOTH to enforce it. See "Quotes Without an Account" below.
NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAA..."   # widget key, public
TURNSTILE_SECRET_KEY="0x4AAA..."             # verification key, server only
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

There is one quote button on the site — `RequestQuoteButton`, placed in the masthead,
hero, workflow, rate sheet, stock index, contact page, and footer — and it has two
destinations, decided in `src/lib/quote.ts` by whether the visitor has a session:

- **Signed in** → the composer on their desk, with `?quote=1`.
- **Signed out** → `/quote`, the public form that needs no account at all. See
  "Quotes Without an Account" below.

No placement had to change to get this, and no page decides for itself which call to
action a visitor deserves. The button renders pointing at `/quote` and re-points once
the session resolves; a signed-in customer who taps early lands on `/quote` and is
forwarded to their composer, which is the harmless direction to be wrong in.

The signed-in half is unchanged: the composer's
"Quote" checkbox is off by default, and only that link pre-ticks it, for that visit —
submitting clears it again. Signing in on the way keeps the destination, so a visitor who
clicks a quote button while logged out still lands on a pre-ticked form.

The flag is stored on each request as `PartRequest.quoteRequested`, shown as a badge in the
build ledger and the admin console, and called out in the new-request email. Run
`npx prisma db push` against a local `file:` database after deploying this change so the
column exists; on Turso, see "Quotes and Requests" below, which also covers what happens
to the request once it is quoted.

## The 72-Hour Turnaround

The shop's standing lead time is the homepage's lead selling point, aimed squarely at
the visitor whose machine is down today. It appears in four places, in the order that
visitor meets them:

1. **The result listing.** `SITE_TAGLINE` makes the homepage title
   `TakomoCo — 72-Hour Domestic 3D Printing & Additive Manufacturing`, and
   `SITE_DESCRIPTION` opens the snippet under it with the same figure. Both live in
   `src/lib/seo.ts`, and the tagline also feeds the homepage's Open Graph and Twitter
   titles, so all of them stay in step from one constant. The figure leads because it
   has to survive the ~60-character truncation in a listing. Nothing was dropped from
   the title for it; the description traded out "rapid prototyping", which still leads
   the homepage's own copy.
2. **The hero.** A bordered badge directly under the H1 — `72h · Typical turnaround` —
   replacing a chip that read "Fast · Fitted · Flawless" and promised nothing checkable.
   The brand line keeps its place beside the number rather than being replaced by it: a
   specific claim and a brand line do different jobs. The lede opens on the problem
   ("Machine down, part discontinued, deadline this week?") and closes on the figure.
3. **The hero's buttons.** "Request a quote" takes the primary weight and "Start a
   build" — which goes to sign-in — steps back to a secondary, because a visitor in a
   hurry should not meet a login wall first. Under them, a phone link for anyone who
   cannot wait even for a form.
4. **The page itself,** where it always was: the spec sheet's "Lead time · 72 hours" row,
   the 72h counter, and the closing call to action. This is what keeps the title honest
   rather than a bare meta claim.

**It is deliberately absent from `/quote`.** A visitor who has reached the form is
already sold and is there to send a part; that page makes the one timing promise it can
actually keep — a price back within one business day — and nothing more. The two figures
are different promises and must not be blurred into one: a **quote** comes back within a
business day, the **part** runs on the 72-hour turnaround once the price is approved.

## Quotes Without an Account

`/quote` is the public quote form. No sign-up, no password: what the part is, a name,
an email, and a phone number. That is the whole required set — quantity, material, the
date, notes, and company are folded behind one optional disclosure, because the shop
can ask any of them on the callback and every extra required field is another reason to
abandon the form standing next to a broken machine.

The customer gets a reference (`Q-4F2A9C`, derived from the row's id), a confirmation
email, and an offer — never a gate — to open an account for future work.

### It is not a second kind of record

A guest quote is an **ordinary `PartRequest` on the QUOTE track**, so the admin console,
pricing a quote, converting it to a build, invoicing, status emails and the reports PDF
all handle it with no changes at all. What is new is only where the contact details live
and who the row belongs to.

### It belongs to no account, on purpose

**A guest quote is never attached to a customer's account — not even one whose email
address matches it.** Anyone can type anyone's address into a public form, so matching
one would let a stranger drop rows onto someone else's desk, and would leak whether a
given address is registered here. The submitted address is therefore never looked up
against the accounts table at all.

- `PartRequest.guestName` / `guestEmail` / `guestPhone` carry who to answer.
  **`guestEmail` being set is what marks a row as a no-account quote** — there is no
  separate flag, because a flag saying "guest" without saying who would be no use.
- `User.isGuest` marks the **single system row** every guest quote is filed under
  (`no-account@quotes.invalid`). Not a customer and never one: `.invalid` is reserved by
  RFC 2606 so the address can never be registered or receive mail, the password is
  random and held by nobody, and the Clients list filters the row out.

Filing them under *something* rather than nothing is load-bearing:
`/api/download/[fileId]` treats a file whose request has no owning customer as a public
asset, so an unowned guest quote would publish its own uploads. Owned by the system row,
a guest's files stay behind the admin check.

The console, its search box, and the report PDF read the contact off the request
(`requestContact` in `src/lib/guest-quote.ts`) rather than off the owning row, so the
shop sees the person who wrote in. Opening an account later does **not** inherit an
earlier guest quote — that is the point — and both the confirmation email and the
success panel say so.

### Keeping bots out without slowing customers down

`POST /api/requests/guest` is the one endpoint on this site that anyone may post to. It is
defended in layers, cheapest first, and **none of them asks the customer for anything**:

1. **Honeypot** — a field hidden from people and out of the tab order. Anything in it is a
   bot filling every input on the page. The response is an ordinary success, so the sender
   learns nothing; the attempt is logged with the address it claimed, so a real submission
   that somehow tripped it can still be recovered from the server log.
2. **Signed form token** (`src/lib/form-token.ts`) — the page fetches one on mount and
   hands it back on submit. A blind POST has none and cannot forge one; a token also
   carries when it was issued, so a submission that arrives 200ms after the form loaded is
   rejected, and one harvested last week has expired. Stateless: an HMAC over
   `NEXTAUTH_SECRET`, no table, nothing to clean up, identical behaviour on a cold start.
3. **Cloudflare Turnstile** — optional, off unless both keys are set. Managed mode is
   invisible to almost every real visitor. Nothing is loaded in the browser when it is not
   configured. A Cloudflare outage fails **open**; a response Cloudflare actively rejects
   fails closed.
4. **Rate limits** (`src/lib/rate-limit.ts`) — 5 per address per hour, 15 per address per
   day, 5 per email address per day. Counters live in the database, because an in-process
   counter resets on every serverless cold start and protects nothing. Addresses are stored
   as an HMAC, never in the clear. If the database is unreachable this fails **open**: a
   real customer's quote still goes through, with the other three layers still standing.
5. **The same file validation the composer runs** — extension, size, and leading bytes,
   through the shared reader in `src/lib/part-source-server.ts`. A guest cannot upload
   anything a signed-in customer could not.

Everything that can reject a request without touching the database or R2 happens before
anything that does.

### What lands where

| | |
|---|---|
| Page | `/quote` (public, indexed, in the sitemap) |
| Endpoints | `POST /api/requests/guest`, `GET /api/requests/guest/token` |
| Row | `PartRequest` · `kind: QUOTE` · `status: QUOTE REQUESTED` · `quoteRequested: true` · `guestEmail` set |
| Owner | The one system `User` (`isGuest: true`) — never a customer account |
| Console | Listed with every other quote, badged **No account** |
| Emails | `[No account] Quote request Q-…` to `ADMIN_EMAIL`; a confirmation to the customer |

### Applying this to Turso

Four columns and one table, all additive:

```
TURSO_DATABASE_URL="libsql://YOUR_DB.turso.io" \
TURSO_AUTH_TOKEN="YOUR_TOKEN" \
node scripts/migrate-turso.mjs prisma/migrations/2026-add-guest-quotes.sql
```

Safe to run before deploying the new code — the currently deployed code never reads any
of it. Against a local `file:` database, `npx prisma db push` is enough. Re-running the
migration fails with "duplicate column name: isGuest" and changes nothing; that is the
signal it is already applied, not damage.

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

## Quotes and Requests

A submission is on one of two tracks, and `PartRequest.kind` says which:

- **QUOTE** — the customer wants a price first. Nothing is manufactured while a
  row sits here.
- **REQUEST** — a live build. This is the original track with the original
  statuses.

They used to share one set of statuses, so a quote sat in `PENDING` and then
`ACTIVE` exactly like a build, which said nothing about whether a price had been
sent or accepted. Each track now has its own vocabulary:

| Quote | Request |
| --- | --- |
| `QUOTE REQUESTED` — came in, not priced yet | `PENDING` — queued, not started |
| `QUOTE IN REVIEW` — being modelled and/or priced | `ACTIVE` — on the machines |
| `QUOTE SENT` — price is with the customer | `NEEDS REVIEW` — blocked, needs a decision |
| `QUOTE ACCEPTED` — approved, ready to convert | `INVOICE SENT` — waiting on payment |
| `QUOTE DECLINED` — customer turned the price down | `COMPLETED` — built |
| `QUOTE EXPIRED` — no answer before it went stale | `SHIPPED` — in the post |
| `CANCELLED` | `CANCELLED` |

`CANCELLED` is the only status both share. The lists, the tone each status is
drawn in, and the rules about which one may be set live in
`src/lib/request-status.ts`, so the console, the customer ledger, the report PDF,
and the email templates never disagree. `PATCH /api/requests/[id]/status`
validates against the row's own track and rejects a build status on a quote (and
the reverse) with a 400.

### Converting a quote into a request

An admin converts a quote from the console — the **Convert** button on any quote
row, or **Convert to request** in the quote's detail modal. Either one:

- flips `kind` to `REQUEST`,
- restarts the status at `PENDING`, at the front of the build queue,
- stamps `convertedAt`,
- and saves whatever is in the modal's **Quoted Price** field, so pricing a job
  and starting it is one action rather than two.

`quoteRequested` deliberately stays `true` — it is the record that this job was
priced before it was built, and both the console and the customer's ledger badge
it "From quote" afterwards. A cancelled quote cannot be converted; it has to be
re-filed. A declined or expired one can be, since customers change their minds —
the console asks for confirmation first.

The price is free text (`quotedPrice`), like the invoice and tracking numbers
beside it, so it can carry a currency, a range, or a caveat. It can also be saved
on its own with `PATCH /api/requests/[id]/quote` before anyone decides whether to
convert.

Statuses are assigned at submission: a quoted submission is filed as
`QUOTE`/`QUOTE REQUESTED`, everything else as `REQUEST`/`PENDING`. Because a
described part is always quoted first, it always starts on the quote track.

### Applying this to Turso

Additive and backward-compatible — no table is rebuilt, nothing is dropped, and
every new column is nullable or defaulted — so it is safe to run against live
data and safe to run **before** deploying the new code.

Back up first:

```bash
turso db shell YOUR_DB .dump > backup.sql
```

**From the Turso web SQL console** (app.turso.tech → your database → SQL): the
console runs one statement at a time, so open
`prisma/migrations/2026-add-quote-conversion.sql` and paste its four numbered
statements one by one, in order, pressing Run after each:

```sql
ALTER TABLE "PartRequest" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'REQUEST';
ALTER TABLE "PartRequest" ADD COLUMN "quotedPrice" TEXT;
ALTER TABLE "PartRequest" ADD COLUMN "convertedAt" DATETIME;
UPDATE "PartRequest"
   SET "kind" = 'QUOTE', "status" = 'QUOTE REQUESTED'
 WHERE "quoteRequested" <> 0 AND "status" = 'PENDING';
```

**Or apply the whole file at once:**

```bash
TURSO_DATABASE_URL="libsql://YOUR_DB.turso.io" \
TURSO_AUTH_TOKEN="YOUR_TOKEN" \
node scripts/migrate-turso.mjs prisma/migrations/2026-add-quote-conversion.sql
```

`node migrate-turso.mjs` prompts for both values and applies this same migration
by default. Afterwards it prints the row count for every `kind`/`status` pair, so
a silent no-op is obvious.

The backfill (statement 4) moves only quotes that are still sitting where they
were filed. A quote that had already gone `ACTIVE`, `INVOICE SENT`, `SHIPPED`,
`COMPLETED`, `NEEDS REVIEW`, or `CANCELLED` was in practice already being worked
as a build, so it stays a `REQUEST` and keeps its status — converting it now
would rewind it. Re-running statement 1 fails with `duplicate column name: kind`
and changes nothing; that is the signal it is already applied.

Verify afterwards:

```bash
turso db shell YOUR_DB "SELECT kind, status, COUNT(*) FROM PartRequest GROUP BY kind, status;"
```

**Run the SQL before deploying the code, not after.** The migration is safe
against the currently deployed code, which never reads the new columns — but
Prisma selects every column it knows about, so the *new* code cannot read a
database that is missing them. Migrate, then deploy.

`requestKind()` still falls back to `quoteRequested` when a row carries no
`kind`, which keeps anything the migration deliberately left alone reading
sensibly.

### Free PLA 2.0 sample

`PartRequest.isFreeSample` marks the one free PLA 2.0 sample a first-time
customer may claim. It defaults to `false`, so every row written before this
column existed reads as "not a sample" with no backfill needed. Eligibility is
meant to be checked as "does this user have any row with `isFreeSample = true`
already", not "has this user ever placed a request" — so someone who ordered
before the sample program existed can still claim one.

**Applying this to Turso** — additive and backward-compatible, one `ALTER
TABLE` statement, safe to run against live data and before deploying the new
code:

```bash
turso db shell YOUR_DB .dump > backup.sql   # back up first

TURSO_DATABASE_URL="libsql://YOUR_DB.turso.io" \
TURSO_AUTH_TOKEN="YOUR_TOKEN" \
node scripts/migrate-turso.mjs prisma/migrations/2026-add-free-sample.sql
```

Or paste the single statement into the Turso web SQL console
(app.turso.tech → your database → SQL):

```sql
ALTER TABLE "PartRequest" ADD COLUMN "isFreeSample" BOOLEAN NOT NULL DEFAULT false;
```

Re-running it fails with `duplicate column name: isFreeSample` and changes
nothing — that's the signal it's already applied, not damage.

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
