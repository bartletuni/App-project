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
