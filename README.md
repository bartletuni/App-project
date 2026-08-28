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

Run `npx prisma db push` after deploying this change so the new columns and the
`RequestAttachment` table exist.

### Validation

Limits and messages live in `src/lib/part-source.ts` and are shared by both forms
and the API, so the client and the server never disagree. Uploads are content-
sniffed in `src/lib/file-signatures.ts` — an extension is only a claim, and a
file whose leading bytes contradict its name is rejected before it reaches R2.
