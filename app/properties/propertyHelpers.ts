// Small shared helpers for the properties pages (list + detail).

/** The fixed monthly checklist. Must match the wording used on the caretaker's checklist. */
export const CHECKLIST_ITEMS = [
  "Check water and plumbing",
  "Check electrical systems",
  "Check doors and windows",
  "Check air conditioning",
  "Check general property condition",
];

export type StatusTone = "good" | "warn" | "info" | "muted";

const OPEN_STATUSES = ["REPORTED", "PENDING_APPROVAL", "APPROVED", "IN_PROGRESS"];

/** Counts requests by what the owner cares about. */
export function summarizeRequests(requests: { status: string }[]) {
  return {
    awaiting: requests.filter((r) => r.status === "PENDING_APPROVAL").length,
    inProgress: requests.filter((r) => r.status === "APPROVED" || r.status === "IN_PROGRESS").length,
    open: requests.filter((r) => OPEN_STATUSES.includes(r.status)).length,
  };
}

/** The one-line "how is this property doing" label, worked out from real data. */
export function propertyStatus(
  hasCaretaker: boolean,
  awaiting: number,
  inProgress: number
): { label: string; tone: StatusTone } {
  if (!hasCaretaker) return { label: "No caretaker yet", tone: "warn" };
  if (awaiting > 0) return { label: "Awaiting you", tone: "warn" };
  if (inProgress > 0) return { label: "Service in progress", tone: "info" };
  return { label: "All good", tone: "good" };
}

/** Which checklist items are done, how many, and when the latest one was completed. */
export function checklistProgress(items: { text: string; completedAt: Date | null }[]) {
  const doneAt = new Map<string, Date | null>();
  for (const item of items) doneAt.set(item.text, item.completedAt);

  const count = CHECKLIST_ITEMS.filter((text) => doneAt.has(text)).length;

  const dates = items
    .map((item) => item.completedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime());

  return { doneAt, count, total: CHECKLIST_ITEMS.length, last: dates[0] ?? null };
}

export function shortDate(date: Date | null) {
  return date
    ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
}

export function initialOf(name: string | null | undefined) {
  return (name?.trim().charAt(0) || "?").toUpperCase();
}
