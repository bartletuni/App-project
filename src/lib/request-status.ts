/**
 * The two tracks a `PartRequest` row can be on, and the statuses that belong
 * to each.
 *
 * A row is either:
 *
 *   QUOTE   — the customer wants a price before anything is built. It moves
 *             through the quoting lifecycle (requested → priced → sent →
 *             accepted/declined) and nothing is manufactured while it sits
 *             here.
 *   REQUEST — a live build. This is the original track, with the original
 *             statuses (pending → active → invoiced → shipped).
 *
 * The two vocabularies were previously mixed: a quote sat in "PENDING" and
 * then "ACTIVE" like any build, which said nothing about whether a price had
 * been sent or accepted. They are now separate, and an admin moves a quote
 * onto the build track explicitly — see `POST /api/requests/[id]/convert`.
 *
 * `PartRequest.quoteRequested` still records that the customer *asked* for a
 * price, and stays true after conversion so the history is not lost.
 * `PartRequest.kind` is what decides which vocabulary a row speaks today.
 */

export type RequestKind = "QUOTE" | "REQUEST";

export const KIND_QUOTE: RequestKind = "QUOTE";
export const KIND_REQUEST: RequestKind = "REQUEST";

/** The quoting lifecycle. Nothing is built while a row is on this track. */
export const QUOTE_STATUSES = [
  "QUOTE REQUESTED", // came in, not priced yet
  "QUOTE IN REVIEW", // being modelled and/or priced
  "QUOTE SENT", // price is with the customer
  "QUOTE ACCEPTED", // customer approved it — ready to convert
  "QUOTE DECLINED", // customer said no
  "QUOTE EXPIRED", // went stale before an answer
  "CANCELLED", // shared with the build track
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
export const DEFAULT_QUOTE_STATUS = "QUOTE REQUESTED";
export const DEFAULT_REQUEST_STATUS = "PENDING";

/** Where a converted quote lands: the front of the build queue. */
export const CONVERTED_STATUS = DEFAULT_REQUEST_STATUS;

/** Ends a row on either track, and is the one status both share. */
export const CANCELLED_STATUS = "CANCELLED";

/** Ceiling on the free-text quoted price, matched by both routes that set it. */
export const MAX_QUOTED_PRICE_CHARS = 100;

/** Anything other than the literal "QUOTE" is treated as a build request. */
export function parseKind(raw: string | null | undefined): RequestKind {
  return raw === KIND_QUOTE ? KIND_QUOTE : KIND_REQUEST;
}

/**
 * Which track a row is on.
 *
 * Rows written before `kind` existed have no value for it. Those fall back to
 * `quoteRequested`, which is how a quote used to be recognised — so an
 * un-migrated or partially-migrated database still reads correctly.
 */
export function requestKind(
  request: { kind?: string | null; quoteRequested?: boolean | null } | null | undefined
): RequestKind {
  if (request?.kind) return parseKind(request.kind);
  return request?.quoteRequested ? KIND_QUOTE : KIND_REQUEST;
}

export function isQuote(
  request: { kind?: string | null; quoteRequested?: boolean | null } | null | undefined
): boolean {
  return requestKind(request) === KIND_QUOTE;
}

/** The statuses an admin may choose from for a row on this track. */
export function statusesFor(kind: RequestKind): readonly string[] {
  return kind === KIND_QUOTE ? QUOTE_STATUSES : REQUEST_STATUSES;
}

export function defaultStatusFor(kind: RequestKind): string {
  return kind === KIND_QUOTE ? DEFAULT_QUOTE_STATUS : DEFAULT_REQUEST_STATUS;
}

export function isValidStatus(kind: RequestKind, status: string): boolean {
  return statusesFor(kind).includes(status);
}

/** Every status either track can use — for filter menus and validation. */
export const ALL_STATUSES = Array.from(
  new Set<string>([...QUOTE_STATUSES, ...REQUEST_STATUSES])
);

/**
 * True while a row is still sitting where it was filed, which is what the
 * customer's 30-minute self-cancel window applies to. A quote starts on
 * "QUOTE REQUESTED" rather than "PENDING", so this cannot just test one value.
 */
export function isUntouched(
  request: { kind?: string | null; quoteRequested?: boolean | null; status?: string | null } | null | undefined
): boolean {
  return request?.status === defaultStatusFor(requestKind(request));
}

/**
 * Whether this row can be turned into a build request, and why not when it
 * cannot. A cancelled quote has to be re-filed rather than revived; anything
 * else on the quote track can be converted, including a declined or expired
 * one, because customers do change their minds.
 */
export function convertability(
  request:
    | { kind?: string | null; quoteRequested?: boolean | null; status?: string | null }
    | null
    | undefined
): { ok: true } | { ok: false; reason: string } {
  if (!request) return { ok: false, reason: "Quote not found" };
  if (!isQuote(request)) {
    return { ok: false, reason: "This is already a build request" };
  }
  if (request.status === CANCELLED_STATUS) {
    return { ok: false, reason: "A cancelled quote cannot be converted — file a new request instead" };
  }
  return { ok: true };
}

export function canConvert(
  request:
    | { kind?: string | null; quoteRequested?: boolean | null; status?: string | null }
    | null
    | undefined
): boolean {
  return convertability(request).ok;
}

/**
 * The colour a status carries, named by meaning rather than by hex so the
 * console, the customer ledger, and the email templates can each render it in
 * their own idiom without keeping three lists of statuses in step.
 */
export type StatusTone = "wait" | "review" | "sent" | "active" | "done" | "ship" | "bad" | "muted";

const TONES: Record<string, StatusTone> = {
  PENDING: "wait",
  "QUOTE REQUESTED": "wait",
  "NEEDS REVIEW": "review",
  "QUOTE IN REVIEW": "review",
  "INVOICE SENT": "sent",
  "QUOTE SENT": "sent",
  ACTIVE: "active",
  COMPLETED: "done",
  "QUOTE ACCEPTED": "done",
  SHIPPED: "ship",
  CANCELLED: "bad",
  "QUOTE DECLINED": "bad",
  "QUOTE EXPIRED": "muted",
};

export function statusTone(status: string | null | undefined): StatusTone {
  return TONES[(status || "").toUpperCase()] || "muted";
}

/** Short plain-English gloss, used as the title/tooltip on a status control. */
const HINTS: Record<string, string> = {
  "QUOTE REQUESTED": "Came in — not priced yet",
  "QUOTE IN REVIEW": "Being modelled and/or priced",
  "QUOTE SENT": "Price is with the customer",
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
