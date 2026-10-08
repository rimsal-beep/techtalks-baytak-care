"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * Actions for caretaker job work:
 * - Start an approved maintenance request
 * - Complete a maintenance request that is already in progress
 * - Upload job files
 */

const MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/** Saves ONE file to /public/uploads and returns its URL. */
export async function uploadJobFile(formData: FormData) {
  const user = await getCurrentUser();

  if (!user || user.role !== "CARETAKER") {
    return {
      success: false as const,
      error: "Not allowed.",
    };
  }

  const file = formData.get("file");
  const kind = formData.get("kind");

  if (!(file instanceof File) || file.size === 0) {
    return {
      success: false as const,
      error: "No file received.",
    };
  }

  const extension = EXTENSIONS[file.type];

  if (!extension) {
    return {
      success: false as const,
      error: "Use a JPG, PNG, WebP or GIF photo.",
    };
  }

  if (extension === "pdf" && kind !== "receipt") {
    return {
      success: false as const,
      error: "Only the receipt can be a PDF.",
    };
  }

  if (file.size > MAX_BYTES) {
    return {
      success: false as const,
      error: "Each file must be smaller than 5 MB.",
    };
  }

  try {
    const dir = path.join(process.cwd(), "public", "uploads");

    await mkdir(dir, { recursive: true });

    const name = `${randomUUID()}.${extension}`;

    await writeFile(
      path.join(dir, name),
      Buffer.from(await file.arrayBuffer()),
    );

    return {
      success: true as const,
      url: `/uploads/${name}`,
    };
  } catch (error) {
    console.error("Failed to save job file:", error);

    return {
      success: false as const,
      error: "Could not save the file.",
    };
  }
}

/**
 * Starts work on an approved request.
 *
 * APPROVED -> IN_PROGRESS
 *
 * Only the caretaker assigned to the property can do this.
 * Exactly one activity log is created for the transition.
 */
export async function startWork(requestId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false as const,
      error: "Not logged in.",
    };
  }

  if (user.role !== "CARETAKER") {
    return {
      success: false as const,
      error: "Only caretakers can start work.",
    };
  }

  if (!requestId?.trim()) {
    return {
      success: false as const,
      error: "Request ID is required.",
    };
  }

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
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
      success: false as const,
      error: "Request not found.",
    };
  }

  if (request.property.caretakerId !== user.id) {
    return {
      success: false as const,
      error: "You are not allowed to start this request.",
    };
  }

  if (request.status !== "APPROVED") {
    return {
      success: false as const,
      error: "Only approved requests can be started.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.updateMany({
        where: {
          id: request.id,
          status: "APPROVED",
        },
        data: {
          status: "IN_PROGRESS",
        },
      });

      if (updated.count !== 1) {
        throw new Error("START_WORK_CONFLICT");
      }

      await tx.activityLog.create({
        data: {
          action: "Work started",
          previousStatus: "APPROVED",
          newStatus: "IN_PROGRESS",
          performedById: user.id,
          maintenanceRequestId: request.id,
          propertyId: request.propertyId,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "START_WORK_CONFLICT") {
      return {
        success: false as const,
        error: "This request has already been started or changed.",
      };
    }

    console.error("Failed to start work:", error);

    return {
      success: false as const,
      error: "Could not start the work. Try again.",
    };
  }

  revalidatePath("/caretaker/dashboard", "layout");
  revalidatePath(`/caretaker/dashboard/requests/${request.id}`);
  revalidatePath(`/requests/${request.id}`);

  return {
    success: true as const,
  };
}

type CompleteJobInput = {
  requestId: string;
  actualCost: number;
  beforePhotoUrls: string[];
  afterPhotoUrls: string[];
  receiptUrl: string;
};

/** A saved upload or a normal https link. Nothing else. */
function cleanUrl(value: string) {
  const v = value.trim();

  if (/^\/uploads\/[A-Za-z0-9-]+\.(jpg|png|webp|gif|pdf)$/.test(v)) {
    return v;
  }

  if (/^https?:\/\/\S+$/i.test(v) && v.length < 2000) {
    return v;
  }

  return null;
}

/**
 * Completes a request that is already in progress.
 *
 * IN_PROGRESS -> COMPLETED
 */
export async function completeJob(input: CompleteJobInput) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false as const,
      error: "Not logged in.",
    };
  }

  if (user.role !== "CARETAKER") {
    return {
      success: false as const,
      error: "Only caretakers can complete requests.",
    };
  }

  if (!input.requestId?.trim()) {
    return {
      success: false as const,
      error: "Request ID is required.",
    };
  }

  if (!Number.isFinite(input.actualCost) || input.actualCost < 0) {
    return {
      success: false as const,
      error: "Enter a valid final cost.",
    };
  }

  const before = input.beforePhotoUrls.map(cleanUrl);
  const after = input.afterPhotoUrls.map(cleanUrl);
  const receipt = cleanUrl(input.receiptUrl ?? "");

  if (before.some((u) => !u) || after.some((u) => !u) || !receipt) {
    return {
      success: false as const,
      error: "One of the files or links is not valid.",
    };
  }

  if (after.length === 0) {
    return {
      success: false as const,
      error: "Add at least one after photo.",
    };
  }

  if (before.length > 10 || after.length > 10) {
    return {
      success: false as const,
      error: "Up to 10 photos each.",
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
      success: false as const,
      error: "Request not found.",
    };
  }

  if (request.property.caretakerId !== user.id) {
    return {
      success: false as const,
      error: "You are not allowed to complete this request.",
    };
  }

  if (request.status !== "IN_PROGRESS") {
    return {
      success: false as const,
      error: "Only in-progress requests can be completed.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.maintenanceRequest.update({
        where: { id: request.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          actualCost: input.actualCost,
          beforePhotoUrls: before as string[],
          afterPhotoUrls: after as string[],
          receiptUrl: receipt,
        },
      });

      await tx.activityLog.create({
        data: {
          action: "Request completed",
          previousStatus: "IN_PROGRESS",
          newStatus: "COMPLETED",
          performedById: user.id,
          maintenanceRequestId: request.id,
          propertyId: request.propertyId,
        },
      });
    });
  } catch (error) {
    console.error("Failed to complete job:", error);

    return {
      success: false as const,
      error: "Could not complete the job. Try again.",
    };
  }

  revalidatePath("/caretaker/dashboard", "layout");
  revalidatePath(`/caretaker/dashboard/requests/${request.id}`);
  revalidatePath(`/requests/${request.id}`);

  return {
    success: true as const,
  };
}