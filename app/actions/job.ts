
"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/** Saves one file to /public/uploads and returns its URL. */
export async function uploadJobFile(formData: FormData) {
  const user = await getCurrentUser();

  if (!user || user.role !== "CARETAKER") {
    return { success: false as const, error: "Not allowed." };
  }

  const file = formData.get("file");
  const kind = formData.get("kind");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false as const, error: "No file received." };
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

    return { success: true as const, url: `/uploads/${name}` };
  } catch (error) {
    console.error("Failed to save job file:", error);
    return {
      success: false as const,
      error: "Could not save the file.",
    };
  }
}

type CompleteJobInput = {
  requestId: string;
  actualCost: number;
  beforePhotoUrls: string[];
  afterPhotoUrls: string[];
  receiptUrl: string;
};

/** Accepts a saved upload URL or an HTTPS/HTTP link. */
function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const url = value.trim();

  if (/^\/uploads\/[A-Za-z0-9-]+\.(jpg|png|webp|gif|pdf)$/.test(url)) {
    return url;
  }

  if (/^https?:\/\/\S+$/i.test(url) && url.length < 2000) {
    return url;
  }

  return null;
}

/**
 * Completes a request with a conditional status update.
 * Only the first submission can change the request and create its activity log.
 */
export async function completeJob(input: CompleteJobInput) {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false as const, error: "Not logged in." };
  }

  if (user.role !== "CARETAKER") {
    return {
      success: false as const,
      error: "Only caretakers can complete requests.",
    };
  }

  if (
    !input ||
    typeof input.requestId !== "string" ||
    !input.requestId.trim()
  ) {
    return {
      success: false as const,
      error: "Request ID is required.",
    };
  }

  if (
    typeof input.actualCost !== "number" ||
    !Number.isFinite(input.actualCost) ||
    input.actualCost < 0
  ) {
    return {
      success: false as const,
      error: "Enter a valid final cost.",
    };
  }

  if (
    !Array.isArray(input.beforePhotoUrls) ||
    !input.beforePhotoUrls.every((url) => typeof url === "string") ||
    !Array.isArray(input.afterPhotoUrls) ||
    !input.afterPhotoUrls.every((url) => typeof url === "string") ||
    typeof input.receiptUrl !== "string"
  ) {
    return {
      success: false as const,
      error: "Invalid photo or receipt input.",
    };
  }

  const before = input.beforePhotoUrls.map(cleanUrl);
  const after = input.afterPhotoUrls.map(cleanUrl);
  const receipt = cleanUrl(input.receiptUrl);

  if (before.some((url) => !url) || after.some((url) => !url) || !receipt) {
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
        select: { caretakerId: true },
      },
    },
  });

  if (!request) {
    return { success: false as const, error: "Request not found." };
  }

  if (request.property.caretakerId !== user.id) {
    return {
      success: false as const,
      error: "You are not allowed to complete this request.",
    };
  }

  // Preserve the existing workflow, but reject terminal or otherwise invalid states.
  if (request.status !== "APPROVED" && request.status !== "IN_PROGRESS") {
    return {
      success: false as const,
      error: "This request is already completed or cannot be completed.",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Compare-and-set: update only if the status is unchanged.
      const updated = await tx.maintenanceRequest.updateMany({
        where: {
          id: request.id,
          status: request.status,
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          actualCost: input.actualCost,
          beforePhotoUrls: before as string[],
          afterPhotoUrls: after as string[],
          receiptUrl: receipt,
        },
      });

      if (updated.count !== 1) {
        return {
          success: false as const,
          error: "This request has already been completed or changed.",
        };
      }

      // The status update and activity log succeed or roll back together.
      await tx.activityLog.create({
        data: {
          action: "Request completed",
          previousStatus: request.status,
          newStatus: "COMPLETED",
          performedById: user.id,
          maintenanceRequestId: request.id,
          propertyId: request.propertyId,
        },
      });

      return { success: true as const };
    });

    if (result.success) {
      revalidatePath("/caretaker/dashboard", "layout");
      revalidatePath(`/caretaker/dashboard/requests/${request.id}`);
      revalidatePath(`/requests/${request.id}`);
    }

    return result;
  } catch (error) {
    console.error("Failed to complete job:", error);

    return {
      success: false as const,
      error: "Could not complete the job. Try again.",
    };
  }
}
