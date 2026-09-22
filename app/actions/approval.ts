"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function approveRequest(requestId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  if (user.role !== "OWNER") {
    return { success: false, error: "Only property owners can approve requests." };
  }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: {
      property: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!request) {
    return { success: false, error: "Request not found." };
  }

  if (request.property.ownerId !== user.id) {
    return { success: false, error: "You are not authorized to approve this request." };
  }

  const previousStatus = request.status;

  const updatedRequest = await prisma.$transaction(async (tx) => {
    const updated = await tx.maintenanceRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        approvedById: user.id,
        approvedAt: new Date(),
        rejectedAt: null,
        rejectionReason: null,
      },
    });

    await tx.activityLog.create({
      data: {
        action: "Request approved",
        previousStatus,
        newStatus: "APPROVED",
        performedById: user.id,
        maintenanceRequestId: request.id,
      },
    });

    return updated;
  });

  return {
    success: true,
    data: updatedRequest,
  };

}

export async function rejectRequest(requestId: string, reason: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  if (user.role !== "OWNER") {
    return { success: false, error: "Only property owners can reject requests." };
  }

  const rejectionReason = reason.trim();

  if (!rejectionReason) {
    return { success: false, error: "Rejection reason is required." };
  }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: {
      property: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!request) {
    return { success: false, error: "Request not found." };
  }

  if (request.property.ownerId !== user.id) {
    return {
      success: false,
      error: "You are not authorized to reject this request.",
    };
  }

  const previousStatus = request.status;

  const updatedRequest = await prisma.$transaction(async (tx) => {
    const updated = await tx.maintenanceRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason,
        approvedById: null,
        approvedAt: null,
      },
    });

    await tx.activityLog.create({
      data: {
        action: "Request rejected",
        previousStatus,
        newStatus: "REJECTED",
        performedById: user.id,
        maintenanceRequestId: request.id,
      },
    });

    return updated;
  });

  return {
    success: true,
    data: updatedRequest,
  };
}