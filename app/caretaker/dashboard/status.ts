export type RequestStatus =
  | "REPORTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED";

/** label + which pill colour to use. */
export const STATUS: Record<string, { label: string; tone: "wait" | "ok" | "prog" | "done" | "no" }> = {
  REPORTED: { label: "Reported", tone: "wait" },
  PENDING_APPROVAL: { label: "Awaiting approval", tone: "wait" },
  APPROVED: { label: "Approved", tone: "ok" },
  IN_PROGRESS: { label: "In progress", tone: "prog" },
  COMPLETED: { label: "Completed", tone: "done" },
  REJECTED: { label: "Declined", tone: "no" },
};

/** The filter tabs on the Requests page. `key` is what goes in ?status= */
export const TABS: { key: string; label: string; match: string[] }[] = [
  { key: "all", label: "All", match: [] },
  { key: "waiting", label: "Awaiting approval", match: ["PENDING_APPROVAL", "REPORTED"] },
  { key: "approved", label: "Approved", match: ["APPROVED", "IN_PROGRESS"] },
  { key: "completed", label: "Completed", match: ["COMPLETED"] },
  { key: "declined", label: "Declined", match: ["REJECTED"] },
];