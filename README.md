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
```

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
(Console → Rates). Page copy, contact details, every service section and line item, and the
material selection matrix are stored in the database and editable in the browser; "Defaults"
restores the built-in TakomoCo catalog.

Until an admin saves, the page serves the built-in catalog, so `/pricing` renders even on a
fresh database. Saving requires the pricing tables, so run `npx prisma db push` after deploying
this change.

Per-gram material rates are intentionally not on this sheet — material cost is carried by each
material record in the stock index (`/admin/materials`).
