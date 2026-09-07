/**
 * The three tracks a `PartRequest` row can be on, and the statuses that belong
 * to each.
 *
 * A row is either:
 *
 *   ESTIMATE — the customer wants a price and we can only give them an
 *              indication of one. This is the default pricing track and the
 *              one nearly every submission starts on. An estimate is
 *              explicitly *not* a binding offer, and every surface that shows
 *              one says so.
 *   QUOTE    — a price the shop is willing to stand behind. Reachable only
 *              when both of the things that make a price guaranteeable are
 *              present: an account we can hold the job against, and the actual
 *              part file we would be printing. See `qualifiesForQuote`.
 *   REQUEST  — a live build. This is the original track, with the original
 *              statuses (pending → active → invoiced → shipped).
 *
 * WHY THE SPLIT
 *
 * A quote is a number the shop is on the hook for. We can only be on the hook
 * for a price when we know exactly what we are printing and who we are
 * printing it for — which means a signed-in customer who uploaded the part
 * file. Anything else (a no-account submission through the public form, or a
 * part we still have to model from a description and some photos) is priced
 * from incomplete information, so it goes out as an estimate and is labelled
 * as one everywhere it appears.
 *
 * The two pricing tracks run the same shape of lifecycle (requested → in
 * review → sent → accepted/declined/expired) but never share a status string,
 * so a row's status alone always says which kind of price is on the table.
 *
 * An estimate is not a dead end: an admin can promote one to a quote once it
 * qualifies, or convert either pricing track straight onto the build queue —
 * see `POST /api/requests/[id]/convert`.
 *
 * `PartRequest.quoteRequested` still records that the customer *asked* for a
 * price, and stays true after conversion so the history is not lost.
 * `PartRequest.kind` is what decides which vocabulary a row speaks today.
 */

export type RequestKind = "ESTIMATE" | "QUOTE" | "REQUEST";

/** The two tracks that are about a price rather than a build. */
export type PricingKind = Exclude<RequestKind, "REQUEST">;

export const KIND_ESTIMATE: PricingKind = "ESTIMATE";
export const KIND_QUOTE: PricingKind = "QUOTE";
export const KIND_REQUEST: RequestKind = "REQUEST";

/**
 * The estimating lifecycle. Nothing is built while a row is on this track, and
 * nothing here is a binding price.
 */
export const ESTIMATE_STATUSES = [
  "ESTIMATE REQUESTED", // came in, not priced yet
  "ESTIMATE IN REVIEW", // being modelled and/or priced
  "ESTIMATE SENT", // indication is with the customer
  "ESTIMATE ACCEPTED", // customer wants to go ahead on it
  "ESTIMATE DECLINED", // customer said no
  "ESTIMATE EXPIRED", // went stale before an answer
  "CANCELLED", // shared with the other tracks
] as const;

/**
 * The quoting lifecycle. Same shape as the estimate track, but the price on
 * one of these rows is one the shop will honour.
 */
export const QUOTE_STATUSES = [
  "QUOTE REQUESTED", // qualifies for a firm price, not priced yet
  "QUOTE IN REVIEW", // being priced
  "QUOTE SENT", // firm price is with the customer
  "QUOTE ACCEPTED", // customer approved it — ready to convert
  "QUOTE DECLINED", // customer turned the price down
  "QUOTE EXPIRED", // went stale before an answer
  "CANCELLED", // shared with the other tracks
] as const;

/** The build lifecycle — the statuses this app has always used. */
export const REQUEST_STATUSES = [
  "PENDING",
  "ACTIVE",
  "NEEDS REVIEW",
  "INVOICE SENT",
  "COMPLETED",
  "SHIPPED",
  "CANCELLED",
] as const;

/** Where a new row starts on each track. */
export const DEFAULT_ESTIMATE_STATUS = "ESTIMATE REQUESTED";
export const DEFAULT_QUOTE_STATUS = "QUOTE REQUESTED";
export const DEFAULT_REQUEST_STATUS = "PENDING";

/** Where a converted estimate or quote lands: the front of the build queue. */
export const CONVERTED_STATUS = DEFAULT_REQUEST_STATUS;

/**
 * Where a promoted estimate lands. Not "QUOTE REQUESTED": the customer already
 * asked, and what is outstanding is the shop turning its indication into a
 * number it will stand behind.
 */
export const PROMOTED_QUOTE_STATUS = "QUOTE IN REVIEW";

/** Ends a row on any track, and is the one status all three share. */
export const CANCELLED_STATUS = "CANCELLED";

/** Ceiling on the free-text price, matched by every route that sets it. */
export const MAX_QUOTED_PRICE_CHARS = 100;

/** Anything unrecognised is treated as a build request. */
export function parseKind(raw: string | null | undefined): RequestKind {
  if (raw === KIND_QUOTE) return KIND_QUOTE;
  if (raw === KIND_ESTIMATE) return KIND_ESTIMATE;
  return KIND_REQUEST;
}

/** The fields the qualification rule and the legacy fallback read. */
export interface PricedRecord {
  kind?: string | null;
  quoteRequested?: boolean | null;
  status?: string | null;
  /** Set only on a submission that came through the public, no-account form. */
  guestEmail?: string | null;
  /** The uploaded .stl/.zip, null when the shop still has to model the part. */
  fileId?: string | null;
}

/**
 * Whether a price for this row could be guaranteed — which is the whole test
 * for whether it may be called a quote rather than an estimate.
 *
 * Both halves are required and neither is negotiable:
 *
 *   * An account. A no-account submission is answered by email to an address
 *     nobody has verified, against no customer record; there is nothing to
 *     hold a firm price against.
 *   * The part file. Without the model we are pricing a description and some
 *     photographs, and the real geometry routinely differs from both.
 */
export function qualifiesForQuote(request: PricedRecord | null | undefined): boolean {
  if (!request) return false;
  return !request.guestEmail && Boolean(request.fileId);
}

/**
 * Positive evidence that this row could never carry a guaranteed price.
 *
 * Deliberately not `!qualifiesForQuote(...)`. Plenty of callers hand us a
 * projection of a row rather than the row — a report line, a ledger entry —
 * and a missing `fileId` key there means "not selected", not "no file". Only
 * an address on the no-account form, or a `fileId` column that is present and
 * empty, is evidence. Anything less leaves the stored kind alone.
 */
function disqualifiedFromQuote(request: PricedRecord): boolean {
  if (request.guestEmail) return true;
  return "fileId" in request && !request.fileId;
}

/** Why this row cannot carry a guaranteed price, or null when it can. */
export function quoteBlocker(request: PricedRecord | null | undefined): string | null {
  if (!request) return "Request not found";
  if (request.guestEmail) {
    return "This came in through the public form and is attached to no account, so its price cannot be guaranteed. Ask the customer to open an account and send the part file, or convert this straight to a build request.";
  }
  if (!request.fileId) {
    return "There is no part file on this row, so its price cannot be guaranteed. Model the part and have the customer submit the file, or convert this straight to a build request.";
  }
  return null;
}

/**
 * Which pricing track a *new* submission belongs on. Called at submission time,
 * before there is a row to inspect.
 */
export function pricingKindFor(submission: {
  /** True for the public, no-account form. */
  isGuest?: boolean;
  /** True when the customer uploaded the .stl/.zip we would print. */
  hasFile?: boolean;
}): PricingKind {
  return !submission.isGuest && submission.hasFile ? KIND_QUOTE : KIND_ESTIMATE;
}

/**
 * Which track a row is on.
 *
 * Rows written before `kind` existed have no value for it, and rows written
 * before the estimate track existed say "QUOTE" for both kinds of price. Both
 * are re-read through the qualification rule, so an un-migrated or
 * partially-migrated database never shows a guaranteed price where we could
 * not have guaranteed one.
 */
export function requestKind(request: PricedRecord | null | undefined): RequestKind {
  if (request?.kind) {
    const stored = parseKind(request.kind);
    if (stored === KIND_QUOTE && disqualifiedFromQuote(request)) return KIND_ESTIMATE;
    return stored;
  }
  if (!request?.quoteRequested) return KIND_REQUEST;
  return qualifiesForQuote(request) ? KIND_QUOTE : KIND_ESTIMATE;
}

export function isQuote(request: PricedRecord | null | undefined): boolean {
  return requestKind(request) === KIND_QUOTE;
}

export function isEstimate(request: PricedRecord | null | undefined): boolean {
  return requestKind(request) === KIND_ESTIMATE;
}

/** True on either pricing track — i.e. nothing is being built yet. */
export function isPricing(request: PricedRecord | null | undefined): boolean {
  return requestKind(request) !== KIND_REQUEST;
}

/** What to call a row of this kind in a badge, a heading, or a column. */
export function kindLabel(kind: RequestKind): string {
  if (kind === KIND_ESTIMATE) return "Estimate";
  if (kind === KIND_QUOTE) return "Quote";
  return "Request";
}

/** The same, read off a row. */
export function requestKindLabel(request: PricedRecord | null | undefined): string {
  return kindLabel(requestKind(request));
}

/** The statuses an admin may choose from for a row on this track. */
export function statusesFor(kind: RequestKind): readonly string[] {
  if (kind === KIND_ESTIMATE) return ESTIMATE_STATUSES;
  if (kind === KIND_QUOTE) return QUOTE_STATUSES;
  return REQUEST_STATUSES;
}

export function defaultStatusFor(kind: RequestKind): string {
  if (kind === KIND_ESTIMATE) return DEFAULT_ESTIMATE_STATUS;
  if (kind === KIND_QUOTE) return DEFAULT_QUOTE_STATUS;
  return DEFAULT_REQUEST_STATUS;
}

export function isValidStatus(kind: RequestKind, status: string): boolean {
  return statusesFor(kind).includes(status);
}

/** Every status any track can use — for filter menus and validation. */
export const ALL_STATUSES = Array.from(
  new Set<string>([...ESTIMATE_STATUSES, ...QUOTE_STATUSES, ...REQUEST_STATUSES])
);

/**
 * The status menu to show for one row: its track's vocabulary, plus whatever
 * the row actually says if that is not in it.
 *
 * The extra entry is for rows the qualification rule re-reads — a pre-estimate
 * "QUOTE SENT" row that came in with no account is shown as an estimate, and a
 * menu without its own value in it would silently offer to rewrite the status
 * the moment anyone touched the control.
 */
export function statusOptionsFor(request: PricedRecord | null | undefined): readonly string[] {
  const options = statusesFor(requestKind(request));
  const current = request?.status;
  if (!current || options.includes(current)) return options;
  return [current, ...options];
}

/**
 * True while a row is still sitting where it was filed, which is what the
 * customer's 30-minute self-cancel window applies to. Each track starts on its
 * own status, so this cannot just test one value.
 */
export function isUntouched(request: PricedRecord | null | undefined): boolean {
  return request?.status === defaultStatusFor(requestKind(request));
}

/**
 * Where a row may be moved to next, and why not when it cannot.
 *
 * Two destinations:
 *
 *   REQUEST — the build queue. Open to both pricing tracks. A cancelled row
 *             has to be re-filed rather than revived; anything else can go,
 *             including a declined or expired one, because customers do change
 *             their minds.
 *   QUOTE   — a guaranteed price. Open only to an estimate, and only once that
 *             estimate qualifies: an account, and the part file. This is the
 *             rule the whole estimate/quote split exists to enforce, so it is
 *             checked here rather than in any one caller.
 */
export function convertability(
  request: PricedRecord | null | undefined,
  target: RequestKind = KIND_REQUEST
): { ok: true } | { ok: false; reason: string } {
  if (!request) return { ok: false, reason: "Request not found" };

  const kind = requestKind(request);

  if (request.status === CANCELLED_STATUS) {
    return {
      ok: false,
      reason: `A cancelled ${kindLabel(kind).toLowerCase()} cannot be converted — file a new request instead`,
    };
  }

  if (target === KIND_QUOTE) {
    if (kind === KIND_REQUEST) {
      return { ok: false, reason: "This is already a build request" };
    }
    if (kind === KIND_QUOTE) {
      return { ok: false, reason: "This is already a quote" };
    }
    const blocker = quoteBlocker(request);
    if (blocker) return { ok: false, reason: blocker };
    return { ok: true };
  }

  if (target === KIND_REQUEST) {
    if (kind === KIND_REQUEST) {
      return { ok: false, reason: "This is already a build request" };
    }
    return { ok: true };
  }

  return { ok: false, reason: "An estimate is where a price starts — nothing converts back to one" };
}

export function canConvert(
  request: PricedRecord | null | undefined,
  target: RequestKind = KIND_REQUEST
): boolean {
  return convertability(request, target).ok;
}

/** Shorthand for the admin console's "promote to quote" control. */
export function canPromoteToQuote(request: PricedRecord | null | undefined): boolean {
  return canConvert(request, KIND_QUOTE);
}

/**
 * The colour a status carries, named by meaning rather than by hex so the
 * console, the customer ledger, and the email templates can each render it in
 * their own idiom without keeping three lists of statuses in step.
 */
export type StatusTone = "wait" | "review" | "sent" | "active" | "done" | "ship" | "bad" | "muted";

const TONES: Record<string, StatusTone> = {
  PENDING: "wait",
  "ESTIMATE REQUESTED": "wait",
  "QUOTE REQUESTED": "wait",
  "NEEDS REVIEW": "review",
  "ESTIMATE IN REVIEW": "review",
  "QUOTE IN REVIEW": "review",
  "INVOICE SENT": "sent",
  "ESTIMATE SENT": "sent",
  "QUOTE SENT": "sent",
  ACTIVE: "active",
  COMPLETED: "done",
  "ESTIMATE ACCEPTED": "done",
  "QUOTE ACCEPTED": "done",
  SHIPPED: "ship",
  CANCELLED: "bad",
  "ESTIMATE DECLINED": "bad",
  "QUOTE DECLINED": "bad",
  "ESTIMATE EXPIRED": "muted",
  "QUOTE EXPIRED": "muted",
};

export function statusTone(status: string | null | undefined): StatusTone {
  return TONES[(status || "").toUpperCase()] || "muted";
}

/** Short plain-English gloss, used as the title/tooltip on a status control. */
const HINTS: Record<string, string> = {
  "ESTIMATE REQUESTED": "Came in — not priced yet",
  "ESTIMATE IN REVIEW": "Being modelled and/or priced",
  "ESTIMATE SENT": "Ballpark is with the customer — not a guaranteed price",
  "ESTIMATE ACCEPTED": "Customer wants to proceed — promote to a quote or convert to a request",
  "ESTIMATE DECLINED": "Customer turned the estimate down",
  "ESTIMATE EXPIRED": "No answer before the estimate went stale",
  "QUOTE REQUESTED": "Qualifies for a guaranteed price — not priced yet",
  "QUOTE IN REVIEW": "Being priced as a firm number",
  "QUOTE SENT": "Guaranteed price is with the customer",
  "QUOTE ACCEPTED": "Customer approved the price — ready to convert to a request",
  "QUOTE DECLINED": "Customer turned the price down",
  "QUOTE EXPIRED": "No answer before the quote went stale",
  PENDING: "Queued, not started",
  ACTIVE: "On the machines",
  "NEEDS REVIEW": "Blocked — needs a decision",
  "INVOICE SENT": "Invoiced, waiting on payment",
  COMPLETED: "Built",
  SHIPPED: "In the post",
  CANCELLED: "Called off",
};

export function statusHint(status: string | null | undefined): string {
  return HINTS[(status || "").toUpperCase()] || "";
}
