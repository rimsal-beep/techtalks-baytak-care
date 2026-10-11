export const REQUEST_TYPES = [
  "PLUMBING", "ELECTRICAL", "HVAC", "STRUCTURAL",
  "APPLIANCE", "PAINTING", "CLEANING", "OTHER",
] as const;
type RequestType = (typeof REQUEST_TYPES)[number];
const CURRENCIES = ["USD", "LBP"] as const;
type Currency = (typeof CURRENCIES)[number];

export type MaintenanceRequestFields = {
  title: string;
  description?: string;
  requestType: string;
  estimatedCost?: number;
  currency?: Currency;
  estimateNote?: string;
};

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const fail = (error: string) => ({ success: false as const, error });

// Shared with creation. Return only the six approved editable fields.
export function validateMaintenanceRequestFields(input: MaintenanceRequestFields) {
  const title = text(input?.title);
  const requestType = text(input?.requestType);
  const description = text(input?.description);
  const estimateNote = text(input?.estimateNote);
  if (!title) return fail("Title is required.");
  if (title.length > 120) return fail("Title is too long.");
  if (!REQUEST_TYPES.includes(requestType as RequestType)) return fail("Choose a valid request type.");
  if (description.length > 2000) return fail("Description is too long.");
  if (estimateNote.length > 1000) return fail("Estimate note is too long.");
  const currency = input?.currency ?? "USD";
  if (!CURRENCIES.includes(currency as Currency)) return fail("Choose a valid currency.");
  const estimatedCost = input?.estimatedCost ?? null;
  if (estimatedCost !== null && (
    typeof estimatedCost !== "number" || !Number.isFinite(estimatedCost) ||
    estimatedCost < 0 || estimatedCost > 1_000_000_000
  )) return fail("Estimated cost must be a valid non-negative number.");
  return {
    success: true as const,
    data: {
      title, description: description || null, requestType: requestType as RequestType,
      estimatedCost, currency: currency as Currency, estimateNote: estimateNote || null,
    },
  };
}
