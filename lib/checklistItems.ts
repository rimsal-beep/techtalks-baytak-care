export const CHECKLIST_ITEMS = [
  "Check water and plumbing",
  "Check electrical systems",
  "Check doors and windows",
  "Check air conditioning",
  "Check general property condition",
] as const;

export type ChecklistItemText = (typeof CHECKLIST_ITEMS)[number];

export function isChecklistItemText(value: string): value is ChecklistItemText {
  return (CHECKLIST_ITEMS as readonly string[]).includes(value);
}
