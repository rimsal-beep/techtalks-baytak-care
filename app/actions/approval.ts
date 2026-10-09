"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { REJECTION_REASON_MAX_LENGTH } from "@/lib/rejectionReason";

export async function approveRequest(requestId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in.",
    };
  }

  if (user.role !== "OWNER") {
    return {
      success: false,
      error: "Only property owners can approve requests.",
    };
  }

  if (typeof requestId !== "string" || !requestId.trim()) {
    return {
      success: false,
      error: "Request ID is required.",
    };
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
    return {
      success: false,
      error: "Request not found.",
    };
  }

  if (request.property.ownerId !== user.id) {
    return {
      success: false,
      error: "You are not authorized to approve this request.",
    };
  }

  if (request.status !== "PENDING_APPROVAL") {
    return {
      success: false,
      error: "This request is no longer pending approval.",
    };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.updateMany({
        where: {
          id: request.id,
          status: "PENDING_APPROVAL",
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
        return {
          success: false,
          error: "This request has already been handled.",
        };
      }

      await tx.activityLog.create({
        data: {
          action: "Request approved",
          previousStatus: "PENDING_APPROVAL",
          newStatus: "APPROVED",
          performedById: user.id,
          maintenanceRequestId: request.id,
        },
      });

      return {
        success: true,
      };
    });
  } catch (error) {
    console.error("Failed to approve request:", error);

    return {
      success: false,
      error: "Could not approve the request. Please try again.",
    };
  }
}

export async function rejectRequest(
  requestId: string,
  reason: string
) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in.",
    };
  }

  if (user.role !== "OWNER") {
    return {
      success: false,
      error: "Only property owners can reject requests.",
    };
  }

  if (typeof requestId !== "string" || !requestId.trim()) {
    return {
      success: false,
      error: "Request ID is required.",
    };
  }

  if (typeof reason !== "string") {
    return {
      success: false,
      error: "Rejection reason is required.",
    };
  }

  const rejectionReason = reason.trim();

  if (!rejectionReason) {
    return {
      success: false,
      error: "Rejection reason is required.",
    };
  }

  if (rejectionReason.length > REJECTION_REASON_MAX_LENGTH) {
    return {
      success: false,
      error: `Rejection reason must be ${REJECTION_REASON_MAX_LENGTH} characters or fewer.`,
    };
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
    return {
      success: false,
      error: "Request not found.",
    };
  }

  if (request.property.ownerId !== user.id) {
    return {
      success: false,
      error: "You are not authorized to reject this request.",
    };
  }

  if (request.status !== "PENDING_APPROVAL") {
    return {
      success: false,
      error: "This request is no longer pending approval.",
    };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.updateMany({
        where: {
          id: request.id,
          status: "PENDING_APPROVAL",
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
        return {
          success: false,
          error: "This request has already been handled.",
        };
      }

      await tx.activityLog.create({
        data: {
          action: "Request rejected",
          previousStatus: "PENDING_APPROVAL",
          newStatus: "REJECTED",
          performedById: user.id,
          maintenanceRequestId: request.id,
        },
      });

      return {
        success: true,
      };
    });
  } catch (error) {
    console.error("Failed to reject request:", error);

    return {
      success: false,
      error: "Could not reject the request. Please try again.",
    };
  }
}