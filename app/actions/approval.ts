"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRequestAccess, lockActiveProperty } from "@/lib/authz";
import { REJECTION_REASON_MAX_LENGTH } from "@/lib/rejectionReason";

export async function approveRequest(requestId: string) {
  const a = await requireRequestAccess(requestId, "OWNER");
  if (!a.ok) return { success: false, error: a.error };

  const { user, request } = a;

  if (request.status !== "PENDING_APPROVAL") {
    return {
      success: false,
      error: "Only requests waiting for approval can be approved.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await lockActiveProperty(tx, request.propertyId, user);
      const updated = await tx.maintenanceRequest.updateMany({
        where: {
          id: request.id,
          status: "PENDING_APPROVAL",
          property: { ownerId: user.id, deletedAt: null },
        },
        data: {
          status: "APPROVED",
          approvedById: user.id,
          approvedAt: new Date(),
          rejectedAt: null,
          rejectionReason: null,
        },
      });

      if (updated.count !== 1) {
        throw new Error("DECISION_CONFLICT");
      }

      await tx.activityLog.create({
        data: {
          action: "Request approved",
          previousStatus: "PENDING_APPROVAL",
          newStatus: "APPROVED",
          performedById: user.id,
          maintenanceRequestId: request.id,
          propertyId: request.propertyId,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DECISION_CONFLICT") {
      return {
        success: false,
        error: "This request has already been decided.",
      };
    }

    console.error("Failed to approve request:", error);
    return {
      success: false,
      error: "Could not approve the request. Try again.",
    };
  }

  revalidatePath(`/requests/${request.id}`);
  revalidatePath("/caretaker/dashboard", "layout");

  return { success: true };
}

export async function rejectRequest(requestId: string, reason: string) {
  const a = await requireRequestAccess(requestId, "OWNER");
  if (!a.ok) return { success: false, error: a.error };

  const { user, request } = a;

  if (typeof reason !== "string") {
    return { success: false, error: "Rejection reason is required." };
  }

  const rejectionReason = reason.trim();

  if (!rejectionReason) {
    return { success: false, error: "Rejection reason is required." };
  }

  if (rejectionReason.length > REJECTION_REASON_MAX_LENGTH) {
    return {
      success: false,
      error: `Rejection reason must be ${REJECTION_REASON_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (request.status !== "PENDING_APPROVAL") {
    return {
      success: false,
      error: "Only requests waiting for approval can be rejected.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await lockActiveProperty(tx, request.propertyId, user);
      const updated = await tx.maintenanceRequest.updateMany({
        where: {
          id: request.id,
          status: "PENDING_APPROVAL",
          property: { ownerId: user.id, deletedAt: null },
        },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectionReason,
          approvedById: null,
          approvedAt: null,
        },
      });

      if (updated.count !== 1) {
        throw new Error("DECISION_CONFLICT");
      }

      await tx.activityLog.create({
        data: {
          action: "Request rejected",
          previousStatus: "PENDING_APPROVAL",
          newStatus: "REJECTED",
          performedById: user.id,
          maintenanceRequestId: request.id,
          propertyId: request.propertyId,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DECISION_CONFLICT") {
      return {
        success: false,
        error: "This request has already been decided.",
      };
    }

    console.error("Failed to reject request:", error);
    return {
      success: false,
      error: "Could not reject the request. Try again.",
    };
  }

  revalidatePath(`/requests/${request.id}`);
  revalidatePath("/caretaker/dashboard", "layout");

  return { success: true };
}