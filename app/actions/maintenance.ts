"use server";

import { prisma } from "../../lib/prisma";
import { isChecklistItemText } from "../../lib/checklistItems";
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
};

export async function createMaintenanceRequest(
  input: CreateMaintenanceRequestInput
) {
  const title = text(input?.title);
  const requestType = text(input?.requestType);
  const description = text(input?.description);
  const estimateNote = text(input?.estimateNote);

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

  try {
    // saved privately, real file type read from the bytes
    const issuePhotoUrls: string[] = [];
    for (const photo of issuePhotos) {
      const saved = await saveUpload(photo, { maxBytes: 5 * 1024 * 1024 });
      if (!saved.ok) return fail(saved.error);
      issuePhotoUrls.push(saved.url);
    }

    await prisma.maintenanceRequest.create({
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
      },
    });

    return { success: true as const };
  } catch (error) {
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
      const existingItem = await tx.checklistItem.findFirst({
        where: {
          propertyId,
          text: checklistText,
        },
      });

      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );

      if (
        existingItem?.completed &&
        existingItem.completedAt &&
        existingItem.completedAt >= startOfMonth
      ) {
        throw new Error("CHECKLIST_ITEM_ALREADY_COMPLETED");
      }

      if (existingItem) {
        await tx.checklistItem.update({
          where: { id: existingItem.id },
          data: {
            completed: true,
            completedById: user.id,
            completedAt: new Date(),
          },
        });
      } else {
        await tx.checklistItem.create({
          data: {
            text: checklistText,
            completed: true,
            completedById: user.id,
            completedAt: new Date(),
            propertyId,
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
      return fail("Checklist item is already completed.");
    }

    console.error("Failed to complete checklist item:", error);

    return fail("Failed to complete checklist item.");
  }
}