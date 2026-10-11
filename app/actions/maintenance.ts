"use server";

import { prisma } from "../../lib/prisma";
import { isChecklistItemText } from "../../lib/checklistItems";
import { isUniqueConstraintError, normalizeIdempotencyKey } from "@/lib/idempotency";
import { requirePropertyMember, requireAssignedCaretaker } from "@/lib/authz";
import { saveUpload } from "@/lib/uploads";

const REQUEST_TYPES = [
  "PLUMBING",
  "ELECTRICAL",
  "HVAC",
  "STRUCTURAL",
  "APPLIANCE",
  "PAINTING",
  "CLEANING",
  "OTHER",
] as const;
type RequestType = (typeof REQUEST_TYPES)[number];

const CURRENCIES = ["USD", "LBP"] as const;
type Currency = (typeof CURRENCIES)[number];

const fail = (error: string) => ({ success: false as const, error });

// The browser can send anything. Only a real string counts.
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

type CreateMaintenanceRequestInput = {
  title: string;
  description?: string;
  requestType: string;
  estimatedCost?: number;
  currency?: "USD" | "LBP";
  estimateNote?: string;
  issuePhotos?: File[];
  propertyId: string;
  idempotencyKey: string;
};

export async function createMaintenanceRequest(
  input: CreateMaintenanceRequestInput
) {
  const title = text(input?.title);
  const requestType = text(input?.requestType);
  const description = text(input?.description);
  const estimateNote = text(input?.estimateNote);
  const idempotencyKey = normalizeIdempotencyKey(input?.idempotencyKey);
  if (!idempotencyKey) {
    return fail("A valid idempotency key is required. Refresh the form and try again.");
  }


  if (!title) return fail("Title is required.");
  if (title.length > 120) return fail("Title is too long.");

  if (!REQUEST_TYPES.includes(requestType as RequestType)) {
    return fail("Choose a valid request type.");
  }

  if (description.length > 2000) return fail("Description is too long.");
  if (estimateNote.length > 1000) return fail("Estimate note is too long.");

  const currency = input?.currency ?? "USD";
  if (!CURRENCIES.includes(currency as Currency)) {
    return fail("Choose a valid currency.");
  }

  const estimatedCost = input?.estimatedCost ?? null;
  if (
    estimatedCost !== null &&
    (typeof estimatedCost !== "number" ||
      !Number.isFinite(estimatedCost) ||
      estimatedCost < 0 ||
      estimatedCost > 1_000_000_000)
  ) {
    return fail("Estimated cost must be a valid non-negative number.");
  }

  const issuePhotos = Array.isArray(input?.issuePhotos)
    ? input.issuePhotos.filter(
        (photo) => photo instanceof File && photo.size > 0
      )
    : [];

  if (issuePhotos.length > 10) return fail("You can upload up to 10 photos.");

  // logged in + owner or caretaker of THIS property (not found otherwise)
  const a = await requirePropertyMember(input?.propertyId);
  if (!a.ok) return fail(a.error);

  const existingRequest = await prisma.maintenanceRequest.findFirst({
    where: { reportedById: a.user.id, idempotencyKey },
    select: { id: true },
  });

  if (existingRequest) {
    return { success: true as const, duplicate: true, requestId: existingRequest.id };
  }

  try {
    // saved privately, real file type read from the bytes
    const issuePhotoUrls: string[] = [];
    for (const photo of issuePhotos) {
      const saved = await saveUpload(photo, { maxBytes: 5 * 1024 * 1024 });
      if (!saved.ok) return fail(saved.error);
      issuePhotoUrls.push(saved.url);
    }

    const createdRequest = await prisma.maintenanceRequest.create({
      data: {
        title,
        requestType: requestType as RequestType,
        description: description || null,
        status: estimatedCost !== null ? "PENDING_APPROVAL" : "REPORTED",
        estimatedCost,
        currency: currency as Currency,
        estimateNote: estimateNote || null,
        issuePhotoUrls,
        reportedById: a.user.id,
        propertyId: a.property.id,
        idempotencyKey,
      },
    });

    return { success: true as const, duplicate: false, requestId: createdRequest.id };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existingRequest = await prisma.maintenanceRequest.findFirst({
        where: { reportedById: a.user.id, idempotencyKey },
        select: { id: true },
      });
      if (existingRequest) {
        return { success: true as const, duplicate: true, requestId: existingRequest.id };
      }
    }
    console.error("Failed to create maintenance request:", error);

    return fail("Failed to create maintenance request.");
  }
}

// completeMaintenanceRequest was removed on purpose.
// Completion now goes through completeJob (job.ts), which needs IN_PROGRESS.

type CompleteChecklistItemInput = {
  propertyId: string;
  text: string;
};

export async function completeChecklistItem(
  input: CompleteChecklistItemInput
) {
  const checklistText = text(input?.text);

  if (!checklistText) return fail("Checklist item text is required.");

  if (!isChecklistItemText(checklistText)) {
    return fail("Invalid checklist item.");
  }

  // logged in + CARETAKER + assigned to THIS property (not found otherwise)
  const a = await requireAssignedCaretaker(input?.propertyId);
  if (!a.ok) return fail(a.error);

  const user = a.user;
  const propertyId = a.property.id;

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const existingItem = await tx.checklistItem.findFirst({
        where: { propertyId, text: checklistText, monthKey },
      });

      if (existingItem?.completed) {
        throw new Error("CHECKLIST_ITEM_ALREADY_COMPLETED");
      }

      if (existingItem) {
        const updated = await tx.checklistItem.updateMany({
          where: { id: existingItem.id, completed: false },
          data: { completed: true, completedById: user.id, completedAt: now },
        });
        if (updated.count !== 1) {
          throw new Error("CHECKLIST_ITEM_ALREADY_COMPLETED");
        }
      } else {
        await tx.checklistItem.create({
          data: {
            text: checklistText,
            completed: true,
            completedById: user.id,
            completedAt: now,
            propertyId,
            monthKey,
          },
        });
      }
      await tx.activityLog.create({
        data: {
          action: `Checklist completed: ${checklistText}`,
          performedById: user.id,
          maintenanceRequestId: null,
          propertyId,
        },
      });
    });

    return { success: true as const };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CHECKLIST_ITEM_ALREADY_COMPLETED"
    ) {
      return fail("Checklist item is already completed this month.");
    }

    if (isUniqueConstraintError(error)) return fail("Checklist item is already completed this month.");
    console.error("Failed to complete checklist item:", error);

    return fail("Failed to complete checklist item.");
  }
}