"use server";

import { prisma } from "../../lib/prisma";
import { isChecklistItemText } from "../../lib/checklistItems";
import { requirePropertyMember, requireAssignedCaretaker, isId } from "@/lib/authz";
import { getChecklistMonthRange, matchesChecklistUndoToken } from "@/lib/checklistUndo";
import { revalidatePath } from "next/cache";
import { saveUpload } from "@/lib/uploads";

import { validateMaintenanceRequestFields } from "@/lib/maintenanceRequestFields";

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
  const fields = validateMaintenanceRequestFields(input);
  if (!fields.success) return fields;
  const { title, requestType, description, estimateNote, currency, estimatedCost } = fields.data;

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
        requestType,
        description: description || null,
        status: estimatedCost !== null ? "PENDING_APPROVAL" : "REPORTED",
        estimatedCost,
        currency,
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

type UndoChecklistItemInput = {
  propertyId: string;
  itemId: string;
  text: string;
  undoToken: string;
};

export async function undoChecklistItem(input: UndoChecklistItemInput) {
  const checklistText = text(input?.text);
  if (!isChecklistItemText(checklistText)) return fail("Invalid checklist item.");
  if (!isId(input?.itemId)) return fail("Invalid checklist item.");

  const a = await requireAssignedCaretaker(input?.propertyId);
  if (!a.ok) return fail(a.error);

  const { monthStart, nextMonthStart } = getChecklistMonthRange();
  const changed = "Checklist item changed or is not completed this month. Refresh and try again.";

  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.checklistItem.findFirst({
        where: {
          id: input.itemId,
          propertyId: a.property.id,
          text: checklistText,
          completed: true,
          completedAt: { gte: monthStart, lt: nextMonthStart },
          property: { caretakerId: a.user.id },
        },
      });

      if (!item || !matchesChecklistUndoToken(input?.undoToken, item)) {
        return fail(changed);
      }

      // Compare the server-read snapshot again at the write, so concurrent
      // undo/re-completion or reassignment cannot clear a different completion.
      const updated = await tx.checklistItem.updateMany({
        where: {
          id: item.id,
          propertyId: a.property.id,
          text: checklistText,
          completed: true,
          completedAt: { equals: item.completedAt, gte: monthStart, lt: nextMonthStart },
          completedById: item.completedById,
          updatedAt: item.updatedAt,
          property: { caretakerId: a.user.id },
        },
        data: { completed: false, completedById: null, completedAt: null },
      });

      if (updated.count !== 1) return fail(changed);

      await tx.activityLog.create({
        data: {
          action: `Checklist undone: ${checklistText}`,
          performedById: a.user.id,
          maintenanceRequestId: null,
          propertyId: a.property.id,
        },
      });

      return { success: true as const };
    });

    if (result.success) {
      revalidatePath("/caretaker/dashboard", "layout");
      revalidatePath(`/properties/${a.property.id}`);
      revalidatePath("/properties");
      revalidatePath("/");
      revalidatePath("/activity");
    }
    return result;
  } catch (error) {
    console.error("Failed to undo checklist item:", error);
    return fail("Failed to undo checklist item. Please try again.");
  }
}
