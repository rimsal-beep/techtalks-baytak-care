import { createHmac, timingSafeEqual } from "node:crypto";

type Completion = {
  id: string;
  propertyId: string;
  text: string;
  completed: boolean;
  completedAt: Date | null;
  completedById: string | null;
  updatedAt: Date;
};

// Keep the existing server-local calendar month, including December rollover.
export function getChecklistMonthRange(now = new Date()) {
  return {
    monthStart: new Date(now.getFullYear(), now.getMonth(), 1),
    nextMonthStart: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

// An opaque snapshot of server-read metadata, never a browser-provided date.
export function checklistUndoToken(item: Completion) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters.");
  }

  return createHmac("sha256", secret)
    .update(JSON.stringify([
      "checklist-undo-v1", item.id, item.propertyId, item.text, item.completed,
      item.completedAt?.toISOString(), item.completedById, item.updatedAt.toISOString(),
    ]))
    .digest("hex");
}

export function matchesChecklistUndoToken(token: unknown, item: Completion) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(checklistUndoToken(item)));
}
