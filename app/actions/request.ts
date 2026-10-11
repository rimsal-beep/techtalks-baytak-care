"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRequestAccess } from "@/lib/authz";
import { validateMaintenanceRequestFields, type MaintenanceRequestFields } from "@/lib/maintenanceRequestFields";

const fail = (error: string) => ({ success: false as const, error });
const pendingOnly = "Only requests pending approval can be edited or cancelled. Refresh and try again.";

function refreshRequest(requestId: string, propertyId: string) {
  revalidatePath("/requests", "layout");
  revalidatePath("/requests/" + requestId);
  revalidatePath("/properties/" + propertyId);
  revalidatePath("/properties");
  revalidatePath("/");
  revalidatePath("/activity");
  revalidatePath("/caretaker/dashboard", "layout");
}

export async function editRequest(requestId: string, input: MaintenanceRequestFields) {
  const a = await requireRequestAccess(requestId, "OWNER");
  if (!a.ok) return fail(a.error);
  if (a.request.status !== "PENDING_APPROVAL") return fail(pendingOnly);
  const fields = validateMaintenanceRequestFields(input);
  if (!fields.success) return fields;
  // Keep this request in PENDING_APPROVAL, with an estimate ready for review.
  if (fields.data.estimatedCost === null) return fail("Estimated cost is required for a request pending approval.");
  if (fields.data.estimatedCost > 99_999_999.99) return fail("Estimated cost must be 99,999,999.99 or less.");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.updateMany({
        where: {
          id: a.request.id,
          status: "PENDING_APPROVAL",
          property: { ownerId: a.user.id },
        },
        // Explicit whitelist. Never forward browser input or protected metadata.
        data: {
          title: fields.data.title,
          description: fields.data.description,
          requestType: fields.data.requestType,
          estimatedCost: fields.data.estimatedCost,
          currency: fields.data.currency,
          estimateNote: fields.data.estimateNote,
        },
      });
      if (updated.count !== 1) return fail(pendingOnly);
      await tx.activityLog.create({
        data: {
          action: "Request edited",
          previousStatus: "PENDING_APPROVAL",
          newStatus: "PENDING_APPROVAL",
          performedById: a.user.id,
          maintenanceRequestId: a.request.id,
          propertyId: a.request.propertyId,
        },
      });
      return { success: true as const };
    });
    if (result.success) refreshRequest(a.request.id, a.request.propertyId);
    return result;
  } catch (error) {
    console.error("Failed to edit request:", error);
    return fail("Could not edit the request. Try again.");
  }
}

export async function cancelRequest(requestId: string) {
  const a = await requireRequestAccess(requestId, "OWNER");
  if (!a.ok) return fail(a.error);
  if (a.request.status === "CANCELLED") {
    refreshRequest(a.request.id, a.request.propertyId);
    return { success: true as const };
  }
  if (a.request.status !== "PENDING_APPROVAL") return fail(pendingOnly);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.updateMany({
        where: {
          id: a.request.id,
          status: "PENDING_APPROVAL",
          property: { ownerId: a.user.id },
        },
        data: { status: "CANCELLED" },
      });
      if (updated.count !== 1) {
        // Concurrent cancellation is safe, but another decision or owner is not.
        const cancelled = await tx.maintenanceRequest.findFirst({
          where: { id: a.request.id, status: "CANCELLED", property: { ownerId: a.user.id } },
          select: { id: true },
        });
        return cancelled ? { success: true as const } : fail(pendingOnly);
      }
      await tx.activityLog.create({
        data: {
          action: "Request cancelled",
          previousStatus: "PENDING_APPROVAL",
          newStatus: "CANCELLED",
          performedById: a.user.id,
          maintenanceRequestId: a.request.id,
          propertyId: a.request.propertyId,
        },
      });
      return { success: true as const };
    });
    if (result.success) refreshRequest(a.request.id, a.request.propertyId);
    return result;
  } catch (error) {
    console.error("Failed to cancel request:", error);
    return fail("Could not cancel the request. Try again.");
  }
}
