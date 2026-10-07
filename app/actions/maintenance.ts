"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../lib/prisma";
import { getCurrentUser } from "../../lib/session";
import { isChecklistItemText } from "../../lib/checklistItems";

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
  if (!input.title?.trim()) {
    return {
      success: false,
      error: "Title is required.",
    };
  }

  if (!input.requestType?.trim()) {
    return {
      success: false,
      error: "Request type is required.",
    };
  }

  if (!input.propertyId?.trim()) {
    return {
      success: false,
      error: "Property ID is required.",
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      error: "Not logged in.",
    };
  }

  const property = await prisma.property.findUnique({
    where: { id: input.propertyId },
    select: {
      ownerId: true,
      caretakerId: true,
    },
  });

  if (!property) {
    return {
      success: false,
      error: "Property not found.",
    };
  }

  const isAuthorized =
    property.ownerId === user.id || property.caretakerId === user.id;

  if (!isAuthorized) {
    return {
      success: false,
      error: "Not authorized for this property.",
    };
  }

  try {
    const estimatedCost = input.estimatedCost ?? null;
    const issuePhotos = (input.issuePhotos ?? []).filter(
      (photo) => photo.size > 0
    );

    if (issuePhotos.length > 10) {
      return {
        success: false,
        error: "You can upload up to 10 photos.",
      };
    }

    for (const photo of issuePhotos) {
      if (!photo.type.startsWith("image/")) {
        return {
          success: false,
          error: "The photo must be an image file.",
        };
      }

      if (photo.size > 5 * 1024 * 1024) {
        return {
          success: false,
          error: "The photo must be smaller than 5 MB.",
        };
      }
    }

    const issuePhotoUrls: string[] = [];
    if (issuePhotos.length > 0) {
      const uploadDirectory = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDirectory, { recursive: true });

      for (const photo of issuePhotos) {
        const extension = (photo.type.split("/")[1] || "bin").replace(
          /[^a-z0-9]/gi,
          ""
        );
        const fileName = `${randomUUID()}.${extension}`;
        await writeFile(
          path.join(uploadDirectory, fileName),
          Buffer.from(await photo.arrayBuffer())
        );
        issuePhotoUrls.push(`/uploads/${fileName}`);
      }
    }

    if (
      estimatedCost !== null &&
      (!Number.isFinite(estimatedCost) || estimatedCost < 0)
    ) {
      return {
        success: false,
        error: "Estimated cost must be a valid non-negative number.",
      };
    }

    const maintenanceRequest = await prisma.maintenanceRequest.create({
      data: {
        title: input.title.trim(),
        requestType: input.requestType.trim() as
          | "PLUMBING"
          | "ELECTRICAL"
          | "HVAC"
          | "STRUCTURAL"
          | "APPLIANCE"
          | "PAINTING"
          | "CLEANING"
          | "OTHER",
        description: input.description?.trim() || null,
        status: estimatedCost !== null ? "PENDING_APPROVAL" : "REPORTED",
        estimatedCost,
        currency: input.currency ?? "USD",
        estimateNote: input.estimateNote?.trim() || null,
        issuePhotoUrls,
        reportedById: user.id,
        propertyId: input.propertyId,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to create maintenance request:", error);

    return {
      success: false,
      error: "Failed to create maintenance request.",
    };
  }
}

type CompleteMaintenanceRequestInput = {
  requestId: string;
  actualCost: number;
  beforePhotoUrls?: string[];
  afterPhotoUrls?: string[];
  receiptUrl?: string;
};

export async function completeMaintenanceRequest(
  input: CompleteMaintenanceRequestInput
) {
  if (!input.requestId?.trim()) {
    return {
      success: false,
      error: "Request ID is required.",
    };
  }

  if (!Number.isFinite(input.actualCost) || input.actualCost < 0) {
    return {
      success: false,
      error: "Actual cost must be a valid non-negative number.",
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      error: "Not logged in.",
    };
  }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: input.requestId },
    include: {
      property: {
        select: {
          caretakerId: true,
        },
      },
    },
  });

  if (!request) {
    return {
      success: false,
      error: "Maintenance request not found.",
    };
  }

  if (request.status !== "APPROVED") {
    return {
      success: false,
      error: "Only approved requests can be marked as completed.",
    };
  }

  if (request.property.caretakerId !== user.id) {
    return {
      success: false,
      error: "You are not authorized to complete this request.",
    };
  }

  const beforePhotoUrls = (input.beforePhotoUrls ?? [])
    .map((url) => url.trim())
    .filter(Boolean);
  const afterPhotoUrls = (input.afterPhotoUrls ?? [])
    .map((url) => url.trim())
    .filter(Boolean);
  const receiptUrl = input.receiptUrl?.trim();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.maintenanceRequest.update({
        where: { id: request.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          actualCost: input.actualCost,
          beforePhotoUrls,
          afterPhotoUrls,
          receiptUrl: receiptUrl || null,
        },
      });

      await tx.activityLog.create({
        data: {
          action: "Request completed",
          previousStatus: request.status,
          newStatus: "COMPLETED",
          performedById: user.id,
          maintenanceRequestId: request.id,
        },
      });

    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to complete maintenance request:", error);

    return {
      success: false,
      error: "Failed to complete maintenance request.",
    };
  }
}

type CompleteChecklistItemInput = {
  propertyId: string;
  text: string;
};

export async function completeChecklistItem(
  input: CompleteChecklistItemInput
) {
  if (!input.propertyId?.trim()) {
    return {
      success: false,
      error: "Property ID is required.",
    };
  }

  const checklistText = input.text?.trim();

  if (!checklistText) {
    return {
      success: false,
      error: "Checklist item text is required.",
    };
  }

  if (!isChecklistItemText(checklistText)) {
    return {
      success: false,
      error: "Invalid checklist item.",
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      error: "Not logged in.",
    };
  }

  if (user.role !== "CARETAKER") {
    return {
      success: false,
      error: "Only caretakers can complete checklist items.",
    };
  }

  const property = await prisma.property.findUnique({
    where: { id: input.propertyId },
    select: {
      caretakerId: true,
    },
  });

  if (!property) {
    return {
      success: false,
      error: "Property not found.",
    };
  }

  if (property.caretakerId !== user.id) {
    return {
      success: false,
      error: "You are not authorized for this property.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existingItem = await tx.checklistItem.findFirst({
        where: {
          propertyId: input.propertyId,
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
            propertyId: input.propertyId,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          action: `Checklist completed: ${checklistText}`,
          performedById: user.id,
          maintenanceRequestId: null,
          propertyId: input.propertyId,
        },
      });
    });

    return {
      success: true,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CHECKLIST_ITEM_ALREADY_COMPLETED"
    ) {
      return {
        success: false,
        error: "Checklist item is already completed.",
      };
    }

    console.error("Failed to complete checklist item:", error);

    return {
      success: false,
      error: "Failed to complete checklist item.",
    };
  }
}
