
"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { isChecklistItemText } from "@/lib/checklistItems";
import {
  isUniqueConstraintError,
  normalizeIdempotencyKey,
} from "@/lib/idempotency";

const MAINTENANCE_TYPES = [
  "PLUMBING",
  "ELECTRICAL",
  "HVAC",
  "STRUCTURAL",
  "APPLIANCE",
  "PAINTING",
  "CLEANING",
  "OTHER",
] as const;

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

async function removeUploadedFiles(urls: string[]) {
  await Promise.all(
    urls.map(async (url) => {
      try {
        if (/^\/uploads\/[A-Za-z0-9-]+\.[A-Za-z0-9]+$/.test(url)) {
          await unlink(
            path.join(process.cwd(), "public", url.slice(1))
          );
        }
      } catch {
        // Cleanup is best-effort; the database remains authoritative.
      }
    })
  );
}

export async function createMaintenanceRequest(
  input: CreateMaintenanceRequestInput
) {
  const title =
    typeof input?.title === "string" ? input.title.trim() : "";

  const requestType =
    typeof input?.requestType === "string"
      ? input.requestType.trim()
      : "";

  const propertyId =
    typeof input?.propertyId === "string"
      ? input.propertyId.trim()
      : "";

  const idempotencyKey = normalizeIdempotencyKey(
    input?.idempotencyKey
  );

  if (!title) {
    return { success: false, error: "Title is required." };
  }

  if (
    !MAINTENANCE_TYPES.includes(
      requestType as (typeof MAINTENANCE_TYPES)[number]
    )
  ) {
    return { success: false, error: "A valid request type is required." };
  }

  if (!propertyId) {
    return { success: false, error: "Property ID is required." };
  }

  if (!idempotencyKey) {
    return {
      success: false,
      error: "A valid idempotency key is required. Refresh the form and try again.",
    };
  }

  if (
    input.description !== undefined &&
    typeof input.description !== "string"
  ) {
    return { success: false, error: "Description must be text." };
  }

  if (
    input.estimateNote !== undefined &&
    typeof input.estimateNote !== "string"
  ) {
    return { success: false, error: "Estimate note must be text." };
  }

  const estimatedCost = input.estimatedCost ?? null;

  if (
    estimatedCost !== null &&
    (typeof estimatedCost !== "number" ||
      !Number.isFinite(estimatedCost) ||
      estimatedCost < 0)
  ) {
    return {
      success: false,
      error: "Estimated cost must be a valid non-negative number.",
    };
  }

  const currency = input.currency ?? "USD";

  if (currency !== "USD" && currency !== "LBP") {
    return { success: false, error: "Invalid currency." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Not logged in." };
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      ownerId: true,
      caretakerId: true,
    },
  });

  if (!property) {
    return { success: false, error: "Property not found." };
  }

  if (property.ownerId !== user.id && property.caretakerId !== user.id) {
    return {
      success: false,
      error: "Not authorized for this property.",
    };
  }

  // Fast path for a retry after the first request already succeeded.
  const existingRequest = await prisma.maintenanceRequest.findFirst({
    where: {
      reportedById: user.id,
      idempotencyKey,
    },
    select: { id: true },
  });

  if (existingRequest) {
    return {
      success: true,
      duplicate: true,
      requestId: existingRequest.id,
    };
  }

  if (
    input.issuePhotos !== undefined &&
    !Array.isArray(input.issuePhotos)
  ) {
    return { success: false, error: "Invalid photo input." };
  }

  const issuePhotos = input.issuePhotos ?? [];

  if (
    issuePhotos.some(
      (photo) => !(photo instanceof File) || photo.size < 0
    )
  ) {
    return { success: false, error: "Invalid photo input." };
  }

  const photos = issuePhotos.filter((photo) => photo.size > 0);

  if (photos.length > 10) {
    return {
      success: false,
      error: "You can upload up to 10 photos.",
    };
  }

  for (const photo of photos) {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(photo.type)) {
      return {
        success: false,
        error: "Use JPG, PNG, WebP or GIF image files.",
      };
    }

    if (photo.size > 5 * 1024 * 1024) {
      return {
        success: false,
        error: "Each photo must be smaller than 5 MB.",
      };
    }
  }

  const issuePhotoUrls: string[] = [];

  try {
    if (photos.length > 0) {
      const uploadDirectory = path.join(
        process.cwd(),
        "public",
        "uploads"
      );

      await mkdir(uploadDirectory, { recursive: true });

      for (const photo of photos) {
        const extension = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
        }[photo.type];

        if (!extension) {
          throw new Error("Unsupported photo type.");
        }

        const fileName = `${randomUUID()}.${extension}`;

        await writeFile(
          path.join(uploadDirectory, fileName),
          Buffer.from(await photo.arrayBuffer())
        );

        issuePhotoUrls.push(`/uploads/${fileName}`);
      }
    }

    const created = await prisma.maintenanceRequest.create({
      data: {
        title,
        requestType:
          requestType as (typeof MAINTENANCE_TYPES)[number],
        description: input.description?.trim() || null,
        status: estimatedCost !== null ? "PENDING_APPROVAL" : "REPORTED",
        estimatedCost,
        currency,
        estimateNote: input.estimateNote?.trim() || null,
        issuePhotoUrls,
        reportedById: user.id,
        propertyId,
        idempotencyKey,
      },
      select: { id: true },
    });

    return {
      success: true,
      duplicate: false,
      requestId: created.id,
    };
  } catch (error) {
    await removeUploadedFiles(issuePhotoUrls);

    // A concurrent request with the same key may have won the race.
    if (isUniqueConstraintError(error)) {
      const existing = await prisma.maintenanceRequest.findFirst({
        where: {
          reportedById: user.id,
          idempotencyKey,
        },
        select: { id: true },
      });

      if (existing) {
        return {
          success: true,
          duplicate: true,
          requestId: existing.id,
        };
      }
    }

    console.error("Failed to create maintenance request:", error);

    return {
      success: false,
      error: "Failed to create maintenance request. Please try again.",
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
  if (
    typeof input?.requestId !== "string" ||
    !input.requestId.trim()
  ) {
    return { success: false, error: "Request ID is required." };
  }

  if (
    typeof input.actualCost !== "number" ||
    !Number.isFinite(input.actualCost) ||
    input.actualCost < 0
  ) {
    return {
      success: false,
      error: "Actual cost must be a valid non-negative number.",
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Not logged in." };
  }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: input.requestId },
    include: {
      property: { select: { caretakerId: true } },
    },
  });

  if (!request) {
    return {
      success: false,
      error: "Maintenance request not found.",
    };
  }

  if (request.property.caretakerId !== user.id) {
    return {
      success: false,
      error: "You are not authorized to complete this request.",
    };
  }

  if (request.status !== "APPROVED") {
    return {
      success: false,
      error: "Only approved requests can be marked as completed.",
    };
  }

  const beforePhotoUrls = input.beforePhotoUrls ?? [];
  const afterPhotoUrls = input.afterPhotoUrls ?? [];

  if (
    !Array.isArray(beforePhotoUrls) ||
    !beforePhotoUrls.every((url) => typeof url === "string") ||
    !Array.isArray(afterPhotoUrls) ||
    !afterPhotoUrls.every((url) => typeof url === "string")
  ) {
    return { success: false, error: "Invalid photo URL input." };
  }

  if (
    input.receiptUrl !== undefined &&
    typeof input.receiptUrl !== "string"
  ) {
    return { success: false, error: "Invalid receipt URL." };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.updateMany({
        where: {
          id: request.id,
          status: "APPROVED",
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          actualCost: input.actualCost,
          beforePhotoUrls: beforePhotoUrls.map((url) => url.trim()).filter(Boolean),
          afterPhotoUrls: afterPhotoUrls.map((url) => url.trim()).filter(Boolean),
          receiptUrl: input.receiptUrl?.trim() || null,
        },
      });

      if (updated.count !== 1) {
        return {
          success: false,
          error: "This request has already been completed or changed.",
        };
      }

      await tx.activityLog.create({
        data: {
          action: "Request completed",
          previousStatus: "APPROVED",
          newStatus: "COMPLETED",
          performedById: user.id,
          maintenanceRequestId: request.id,
        },
      });

      return { success: true };
    });
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
  const propertyId =
    typeof input?.propertyId === "string" ? input.propertyId.trim() : "";
  const checklistText =
    typeof input?.text === "string" ? input.text.trim() : "";

  if (!propertyId) {
    return { success: false, error: "Property ID is required." };
  }

  if (!checklistText) {
    return { success: false, error: "Checklist item text is required." };
  }

  if (!isChecklistItemText(checklistText)) {
    return { success: false, error: "Invalid checklist item." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Not logged in." };
  }

  if (user.role !== "CARETAKER") {
    return {
      success: false,
      error: "Only caretakers can complete checklist items.",
    };
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { caretakerId: true },
  });

  if (!property) {
    return { success: false, error: "Property not found." };
  }

  if (property.caretakerId !== user.id) {
    return {
      success: false,
      error: "You are not authorized for this property.",
    };
  }

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  try {
    return await prisma.$transaction(async (tx) => {
      const existingItem = await tx.checklistItem.findFirst({
        where: {
          propertyId,
          text: checklistText,
          monthKey,
        },
      });

      if (existingItem?.completed) {
        return {
          success: false,
          error: "Checklist item is already completed this month.",
        };
      }

      if (existingItem) {
        const updated = await tx.checklistItem.updateMany({
          where: {
            id: existingItem.id,
            completed: false,
          },
          data: {
            completed: true,
            completedById: user.id,
            completedAt: now,
          },
        });

        if (updated.count !== 1) {
          return {
            success: false,
            error: "Checklist item is already completed this month.",
          };
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

      return { success: true };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: "Checklist item is already completed this month.",
      };
    }

    console.error("Failed to complete checklist item:", error);

    return {
      success: false,
      error: "Failed to complete checklist item.",
    };
  }
}
