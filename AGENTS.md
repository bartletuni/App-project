# AGENTS.md

Notes for an agent working in this repository. It is not a tour of the code —
the code is commented, and those comments explain *why* a thing is the way it
is, which is usually what you need. This file covers the things you cannot see
by reading one file: what is wired to what, what has to change together, and
the checks that have to pass before you push.

Read the header comment of any module you are about to change. They are written
to be read and they carry the reasoning; a change that contradicts one is
usually a change that needs discussing rather than making.

This file is maintained by the agents who read it. If your change makes any
part of it wrong, or teaches you something the next agent will need, updating
it is part of the change — see §8.

---

## 1. What this application is

TakomoCo is a small additive-manufacturing shop in Utah. This is the site and
the client console: a customer sends the shop a part, the shop prices it, and —
once an invoice is paid — prints and ships it.

Next.js 14 App Router, TypeScript, Tailwind, Prisma over libSQL/Turso,
NextAuth (credentials), Cloudflare R2 for uploads, Resend for mail, Square for
invoicing (off-site — no card data ever reaches this application).

Two things shape most of the design decisions, and are worth holding in mind:

- **An estimate is not a quote.** A quote is a price the shop is on the hook
  for, and it is only offered where the shop knows exactly what it is printing
  (a real part file) and who for (an account). Everything else is an estimate
  and is labelled as one on every surface that shows it. `src/lib/request-status.ts`
  is where that rule lives.
- **A customer's model is their confidential property.** Uploads are private,
  access-controlled, and never shown to anyone but the owner and the shop. Any
  change near uploads, downloads, or ownership deserves a second read.

---

## 2. Before you finish: run these

There are no `test`, `typecheck`, or `format` npm scripts. Run the tools
directly, from the repository root:

```bash
npx jest              # the whole suite; fast, no database needed
npx tsc --noEmit      # types
npm run lint          # next lint
npx next build        # catches what the others miss (RSC/client boundaries, prerender)
```

Known pre-existing noise, not yours to fix unless you are in that file anyway:

- `src/app/api/requests/__tests__/route.test.ts` has one `Buffer`/`BlobPart`
  type error under `tsc`.
- `src/app/admin/materials/page.tsx` has one `<img>` lint warning.

If you changed anything a person looks at, serve the production build and look
at it: `npx next build && NEXTAUTH_SECRET=dev NEXTAUTH_URL=http://localhost:3000 npx next start`.
Chromium and Playwright are available for driving it.

Then two questions no tool asks for you: do the legal documents still describe
what the application does (§4), and does this file still describe the code
(§8)? If either answer is no, fix it in the same PR.

---

## 3. Coupling map — what is attached to what

Each row is a change you might make and the other places that have to move with
it. Most of these are *not* enforced by a test; the last column says which are.

### Legal documents and the consent flow

| If you change | You must also | Guarded by |
| --- | --- | --- |
| Add a legal page | Add it to `LEGAL_ROUTES` in `src/lib/legal.ts` — that one array feeds both footers, the login page's legal row, the cross-links at the foot of every legal document, and `/sitemap.xml`. Do not hand-add links. | `src/components/__tests__/legal-links-coverage.test.ts` fails if any page cannot reach `<LegalLinks>` |
| Add any page under `src/app` | Make sure it reaches `<LegalLinks>` (usually by rendering `SiteFooter` or `AppShell`) | same test, which walks the real route tree |
| The substance of any legal page | Bump `LEGAL_LAST_UPDATED` in `src/lib/legal.ts`. It is shared by all four documents, and each one promises the date tells the reader when it changed. | nothing — remember it |
| The cookies the app sets | `COOKIE_INVENTORY` in `src/lib/legal.ts` is an inventory, not boilerplate. A *non-essential* cookie also means `CookieNotice` must grow a real opt-in control, because consent has to come first. | nothing |
| The sign-up agreements | The tick-boxes live in `src/app/login/page.tsx` (the local `Consent` component), the enforcement in `src/app/api/auth/register/route.ts`, and the refusal messages and the policy route in `src/lib/legal.ts`. All three move together. Consent is **enforced, not stored** — see §5. | `src/app/api/auth/register/__tests__/route.test.ts` |

### Uploads

| If you change | You must also | Guarded by |
| --- | --- | --- |
| `MODEL_EXTENSIONS` / `REFERENCE_EXTENSIONS` / the size ceilings (`src/lib/part-source.ts`) | Update the matching signature check in `src/lib/file-signatures.ts` — an extension is a claim, the bytes are the fact, and every upload route checks both. Then update the copy that tells customers what is accepted: `/privacy` §02, `/file-retention` §01, the pricing sheet copy seeded in `src/lib/pricing.ts`, the form labels in `PartSourceFields.tsx`, the replacement-parts page, the estimate page's meta description, and the welcome email. The size limit (`MAX_UPLOAD_BYTES`) is for everything in one submission together and must stay under the host's request-body cap (Vercel: ~4.5MB), or the form promises what the host refuses. | `src/lib/__tests__/file-signatures.test.ts`, `part-source.test.ts` — but **not** the customer-facing copy |
| `NEXT_PUBLIC_DIRECT_UPLOADS`, the limits in `part-source.ts`, or anything in `src/lib/direct-upload.ts` | The flag is **baked in at build time** and the limits (`MAX_MODEL_BYTES`, `MAX_REFERENCE_BYTES`, …) and every label follow it. Turning it on also makes the live pricing sheet's "Web Upload" line wrong (the code seed follows the flag via `MODEL_LIMIT_LABEL`, but the admin edits the live copy) and needs the bucket's CORS policy (README → Direct Uploads). `/api/uploads/presign` is a public write surface into the bucket: keep its rate limits, its size/extension validation before signing, and the `pending/` prefix that nothing serves. A receipt is an HMAC bound to its uploader's scope — never accept a key from the client without one, and never skip the readback (`inspectUpload`). `/file-retention` §03 and `/privacy` §02/§07/§09 describe the 24-hour holding area. | `src/lib/__tests__/direct-upload*.test.ts`, `src/app/api/uploads/presign/__tests__`, `src/app/api/requests/__tests__/direct-upload.test.ts` |
| Anything about who owns an uploaded file | Re-read `src/app/api/download/[fileId]/route.ts`. It treats a file with **no owning customer as public**. That is why guest estimates are owned by a system `User` (`User.isGuest`) instead of being left unowned — see the header comment in `src/lib/guest-estimate.ts` and on `User` in the schema. | nothing — this one is load-bearing and quiet |
| Retention or deletion of files | `/file-retention` is the document that describes it, and `/privacy` §02, §03 (purposes), §07 (how long) and §08 (rights, lawful bases) all have to agree with it. | nothing |
| Anything that deletes a stored file | A reorder points a new request at the *same* stored file as the one it repeats (`src/lib/reorder.ts`), so two rows can share a `fileId`. Delete a file because one request went away and you have deleted it from the other. Only the guest "this wasn't me" flow deletes today, and guest rows are never reorderable. | `src/app/api/requests/__tests__/route.test.ts` (reordering) — but **not** the deletion paths |

### Requests, statuses, pricing

| If you change | You must also | Guarded by |
| --- | --- | --- |
| A status string in `src/lib/request-status.ts` | Every surface that reads it: the dashboard, the admin console, `POST /api/requests/[id]/status`, `/convert`, the status emails in `src/lib/email-templates.ts`, and the reports PDF. The three status sets deliberately share no string, so a status alone always says which track a row is on — keep it that way. | `src/lib/__tests__/request-status.test.ts`, `convert.test.ts` |
| The rule for what may be called a quote | `qualifiesForQuote` / `quoteBlocker` in `request-status.ts` are the only definition. The Terms (`/terms` §03) state the same rule to the customer in words — change both or neither. | `request-status.test.ts` |
| The free sample | `src/lib/free-sample.ts` holds the material, quantity, and label; `/terms` §04 describes the offer; `POST /api/requests` and `/api/requests/free-sample` both decide eligibility as "no existing row for this account with `isFreeSample` set". | nothing |
| The published turnaround or tolerance | The homepage spec sheet (`src/app/page.tsx`), the pricing seed (`src/lib/pricing.ts`) and its meta description, and `/terms` §04 (delivery dates) and §07 (variation). The turnaround is make-and-post time counted from payment, with transit on top; the tolerance is published as typical, never as a guarantee. There is deliberately no express tier. | nothing |
| The materials the marketing pages list | One list: `MATERIAL_NAMES` in `src/lib/material-names.ts`, read by the homepage spec sheet and ticker. PET and PETG are different materials and both stay. The real inventory is the stock index, edited in the admin console. | `src/lib/__tests__/material-names.test.ts` |
| Pricing sheet content | It is admin-editable at runtime (`PricingSection` / `PricingItem` / `PricingSetting`). `src/lib/pricing.ts` only seeds the defaults, so editing it does not change a deployed site whose admin has already edited the sheet. | `pricing.test.ts` |

### Shipping

| If you change | You must also | Guarded by |
| --- | --- | --- |
| The carrier, or how parts ship | USPS is the primary carrier and is named, not implied, in: `/terms` §04 (shipping, risk of loss, lost or damaged parcels, sending us a part), `/privacy` §03, §05 (USPS is *not* a service provider acting for us — it sits outside that list under its own policy, `USPS_PRIVACY_URL` in `legal.ts`) and §07, the address hints on the sign-up form and in `/settings`, the welcome email, the replacement-parts and home pages, and the pricing seed. Each shipment records its own carrier (`PartRequest.shippingCarrier`, default `USPS`) and service; `src/lib/shipping.ts` holds the closed carrier set, the service suggestions, and the tracking links, and every surface that shows a tracking number labels and links it through there — never hard-code a carrier name next to one. A published turnaround is make-and-post time; transit is always extra — keep it that way. A customer can correct their own addresses through `/api/user/addresses`; the Terms rely on that when they put a stale address at the customer's risk. | `src/lib/__tests__/shipping.test.ts`, `src/app/api/requests/[id]/__tests__/tracking.test.ts`, `src/app/api/user/addresses/__tests__/route.test.ts` — but **not** the copy |

### Brand, metadata, email, PDF

| If you change | You must also | Guarded by |
| --- | --- | --- |
| A brand colour | `tailwind.config.ts` is the source for anything the browser renders; `src/lib/brand.ts` mirrors the scale as hex/RGB for the two media that never see a stylesheet — HTML email (`C` in `email-templates.ts`) and the jsPDF report (`INK` in `report-pdf.ts`). Each medium keeps its own role map on top of the shared scale. | `brand.test.ts` |
| Business facts (phone, email, hours, region) | `src/lib/seo.ts` `BUSINESS` is the single source. `LEGAL_CONTACT` in `legal.ts` reads from it, and `src/lib/structured-data.ts` publishes it. Nothing here may assert something a visitor cannot verify on the page — no street address, no invented ratings. | nothing |
| Printer specs (build volume, max print temperature, layer height) | The homepage spec sheet (`src/app/page.tsx`), the sign-in page's tiles (`src/app/login/page.tsx`), and `capabilities_statement.txt` at the repo root. The last is served nowhere, which is how it came to say 220 mm and 280 °C while the site said 256 mm and 320 °C. | nothing |
| An email template | `src/lib/email-templates.ts`. Sends are best-effort by design: a mail failure is logged and never blocks a registration or a request. Sanitise anything interpolated into a header (`\r\n` stripping) — see the register route. | `email-templates.test.ts` |
| Mail sent to an address typed into the public estimate form | Only `EstimateReceivedEmailHTML`, and it carries **nothing the sender typed** — the address is a claim, not a fact. The confirm/disown flow lives in `src/lib/guest-email.ts`, the do-not-email list in `src/lib/email-suppression.ts` (HMAC keys under `NEXTAUTH_SECRET`, so rotating the secret empties it), and `/privacy` §02, §03, §07, §08 and `/file-retention` §03 describe both. Shop notifications go to `shopInbox()`, never to the typed address. | `guest/__tests__/route.test.ts`, `guest/confirm/__tests__/route.test.ts` |

### Database

| If you change | You must also | Guarded by |
| --- | --- | --- |
| `prisma/schema.prisma` | Hand-write a `.sql` migration into `prisma/migrations/` (generate with `npx prisma migrate diff --from-schema … --to-schema … --script`), document what it does at the top as the existing ones do, and apply it to Turso **before** deploying code that reads the new column. `npx prisma db push` cannot be used against Turso: the schema's `provider = "sqlite"` rejects a `libsql://` URL with P1013. Apply with `node migrate-turso.mjs <path.sql>` or the Turso web SQL console. | nothing — get it right |
| Any route that reads the database | Keep `export const dynamic = "force-dynamic"`, `fetchCache = "force-no-store"`, `revalidate = 0` on it. The libSQL client reaches Turso over `fetch()`, which Next will otherwise cache — this has already caused a route to serve a read from before a schema change. 17 files currently carry it. | nothing |

---

## 4. Review the policies whenever you change behaviour

**This is the step most easily skipped, so it is written down.** The four
documents under `/terms`, `/privacy`, `/cookies`, and `/file-retention` are
statements about what this application actually does. When the application
changes, at least one of them is usually wrong, and a wrong policy is worse
than a missing one.

Before you open a PR, ask each question and act on it:

1. **Does the change collect anything new from a customer,** or collect
   something existing in a new way? → `/privacy` §02 (what we collect).
2. **Does it use existing data for a new purpose?** → `/privacy` §03. That
   section opens "each thing we collect is used for the job it was collected
   for" and then enumerates purposes; a new purpose that is not on the list
   makes the sentence false.
3. **Does it keep something longer, or shorter?** → `/privacy` §07 and
   `/file-retention` §03.
4. **Does it involve a new third party** touching customer data? → `/privacy`
   §05, and consider §08's cross-border paragraph.
5. **Does it set a cookie or write to browser storage?** → `COOKIE_INVENTORY`
   and `/cookies`. Non-essential storage needs consent *before* it is written.
6. **Does it change what the shop promises about a part, a price, or a file?**
   → `/terms` (§03 estimates vs quotes, §04 orders, shipping, and cancellation, §05 the
   file licence and the customer's warranty, §07 what a printed part is not).
7. **Does it change what a customer agrees to at sign-up?** → the tick-box row
   in §3 above, plus `/file-retention` §06 and `/privacy` §08, which both
   describe the agreement and the lawful bases resting on it.
8. **Did any of the above change?** → bump `LEGAL_LAST_UPDATED`.

Two habits that keep this honest:

- **The documents must agree with each other,** not just with the code. The
  file-type list, the retention window, and the deletion promise each appear in
  more than one document; when you touch one, grep for the others.
- **Never write a promise the code does not keep.** If the policy says a file
  is deleted on request, someone has to be able to do that. If it lists a
  format the uploader rejects, it is a lie to a customer, however small.

A change that is purely internal — a refactor, a performance fix, a test —
needs none of this. Say so in the PR rather than leaving the reader guessing.

If the change creates a *new* link between the code and the legal documents —
a new kind of data, a new third party, a new promise — add it to the questions
above or to the coupling map in §3, so the next agent is asked about it too
(§8).

---

## 5. Conventions and decisions already made

Don't undo these by accident.

- **Consent is enforced, not recorded.** Registration refuses a body without
  `termsAccepted === true` and `retentionPolicyAccepted === true`, and stores
  neither. Every account the route creates has agreed, which is what the legal
  pages tell the customer, and it keeps the database unchanged. If you ever
  need per-account consent *records* (a date, a document version), that is a
  schema change and a deliberate decision — not a quiet addition.
- **Validate on the server, always.** A disabled button is a courtesy; the API
  is the boundary. Check `typeof x === "string"` on `FormData` values before
  using `.length` — `formData.get()` can return a `File`, and the missing check
  was a real bug here once.
- **Every exported handler in an admin or sensitive route needs its own
  auth check.** `getServerSession` plus `isAdmin`. A secured `POST` says
  nothing about the `GET` beside it.
- **Paginate and cap every collection endpoint** (`take: Math.min(limit, 100)`).
- **Normalise emails to lowercase** at every boundary that looks a user up.
- **Public endpoints fail open on rate limiting.** `src/lib/rate-limit.ts`
  stores HMACs of addresses, never addresses, and lets traffic through if the
  database is unreachable — losing a customer's estimate is worse than letting
  one extra request past, and the form token, honeypot, and Turnstile are still
  standing. Keep both properties.
- **Turnstile is optional.** Unset keys must leave the estimate form fully
  working, with nothing loaded in the browser.
- **Accessibility is not a follow-up.** `htmlFor`/`id` on every field, explicit
  `focus-visible` rings (the default outline disappears on this dark theme),
  `aria-current="page"` on active nav, `aria-hidden` on decorative SVGs, and a
  spinner plus a disabled button on anything destructive or slow.
- **Comments explain why.** The house style is a header comment stating the
  decision and its reason. Match the surrounding density; don't narrate what
  the next line plainly does.

---

## 6. Where the knowledge is kept

- `README.md` — setup, environment variables, and a feature-by-feature tour.
  Start there for "how do I run this".
- `.jules/sentinel.md` — security findings and the rule each one produced.
  **Read it before touching an API route**, and append to it when you fix a
  vulnerability.
- `.jules/bolt.md` — performance learnings (query shape, animation loops).
- `.jules/palette.md` and `.Jules/palette.md` — design and accessibility
  learnings.

Each entry is dated, states the learning, and states the rule it produced.
Follow the format when you add one. Adding an entry is how a fix becomes a
convention instead of a thing that gets reintroduced in six months.

---

## 7. Git

- Branch, commit, push, open a PR. The default branch is
  `feat/takomoco-request-app-10494555572852687399`, not `main`.
- Write the commit message for someone reading it in a year: what changed, and
  why it needed to. The existing history is the standard to match.
- A merged PR is finished. Follow-up work starts from a fresh branch off the
  default, never on top of already-merged history.

---

## 8. Keep this file current

This file is only useful while it is true. An agent that reads a stale
coupling map will skip the update the map forgot to mention, and nothing will
fail. So treat `AGENTS.md` as part of the code: **when your change makes it
wrong or incomplete, update it in the same PR.**

Update it when your change:

- **Couples two things that were not coupled before.** A new constant that
  copy elsewhere repeats, a new surface that shows a status, a new place a
  carrier or a file type is named → a row in §3, naming the files that move
  together and what guards them (or "nothing").
- **Touches what the legal documents describe.** Data collected, its purposes,
  how long it is kept, who it is shared with, cookies or browser storage, what
  is promised about a part, a price, a file, or sign-up → the legal pages
  themselves (§4), *and* this file wherever it names the section or rule that
  changed. A new kind of change that should send the next agent to a policy is
  a new question in §4.
- **Moves, renames, or deletes something this file names** — a path, a
  constant, a test, a section number in a legal page. Grep this file for the
  old name.
- **Settles a decision** that someone could plausibly undo by accident → §5,
  with the reason.
- **Changes how the work is checked or shipped** — a new script, a new
  required check, new pre-existing noise, a new migration step → §2, §3
  "Database", or §7.
- **Uncovers something you could not see by reading one file,** and that cost
  you time or nearly caused a bug. If the next agent reviewing this code
  should know it, write it here.

How to write an entry:

- **Put it where it will be read** — in the section it belongs to, not
  appended as a loose note at the end.
- **Say why, and say what guards it.** "Guarded by: nothing" is useful
  information; it tells a reviewer what to check by hand.
- **Prefer pointers to copies.** Name the file, constant, or test; do not
  paste its contents, which will drift.
- **Remove what is no longer true** rather than adding a correction beside it.
- **Don't duplicate the `.jules/` logs.** A dated security, performance, or
  design learning still goes there (§6); add a line here only when it changes
  what an agent must do across the codebase.

When reviewing a change, ask the same question of it: does `AGENTS.md` still
describe the code after this lands? If not, the PR is not finished. Say in the
PR description that you updated it, or that you checked and it needed nothing.
