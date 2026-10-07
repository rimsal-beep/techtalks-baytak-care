"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * Actions for the "Complete the job" form on the caretaker request page.
 * They sit next to the old completeMaintenanceRequest and do not change it.
 */

const MAX_BYTES = 5 * 1024 * 1024; // same limit as the report form
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
  if (!user || user.role !== "CARETAKER") return { success: false as const, error: "Not allowed." };

  const file = formData.get("file");
  const kind = formData.get("kind"); // "photo" or "receipt"
  if (!(file instanceof File) || file.size === 0) return { success: false as const, error: "No file received." };

  const extension = EXTENSIONS[file.type];
  if (!extension) return { success: false as const, error: "Use a JPG, PNG, WebP or GIF photo." };
  if (extension === "pdf" && kind !== "receipt") return { success: false as const, error: "Only the receipt can be a PDF." };
  if (file.size > MAX_BYTES) return { success: false as const, error: "Each file must be smaller than 5 MB." };

  try {
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.${extension}`;
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return { success: true as const, url: `/uploads/${name}` };
  } catch (error) {
    console.error("Failed to save job file:", error);
    return { success: false as const, error: "Could not save the file." };
  }
}

type CompleteJobInput = {
  requestId: string;
  actualCost: number;
  beforePhotoUrls: string[];
  afterPhotoUrls: string[];
  receiptUrl: string;
};

/** A saved upload ("/uploads/x.jpg") or a normal https link. Nothing else. */
function cleanUrl(value: string) {
  const v = value.trim();
  if (/^\/uploads\/[A-Za-z0-9-]+\.(jpg|png|webp|gif|pdf)$/.test(v)) return v;
  if (/^https?:\/\/\S+$/i.test(v) && v.length < 2000) return v;
  return null;
}

/** Marks an approved request as completed, with final cost, photos and receipt. */
export async function completeJob(input: CompleteJobInput) {
  const user = await getCurrentUser();
  if (!user) return { success: false as const, error: "Not logged in." };

  if (!input.requestId?.trim()) return { success: false as const, error: "Request ID is required." };
  if (!Number.isFinite(input.actualCost) || input.actualCost < 0) {
    return { success: false as const, error: "Enter a valid final cost." };
  }

  const before = input.beforePhotoUrls.map(cleanUrl);
  const after = input.afterPhotoUrls.map(cleanUrl);
  const receipt = cleanUrl(input.receiptUrl ?? "");
  if (before.some((u) => !u) || after.some((u) => !u) || !receipt) {
    return { success: false as const, error: "One of the files or links is not valid." };
  }
  if (after.length === 0) return { success: false as const, error: "Add at least one after photo." };
  if (before.length > 10 || after.length > 10) return { success: false as const, error: "Up to 10 photos each." };

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: input.requestId },
    include: { property: { select: { caretakerId: true } } },
  });
  if (!request) return { success: false as const, error: "Request not found." };
  if (request.property.caretakerId !== user.id) {
    return { success: false as const, error: "You are not allowed to complete this request." };
  }
  if (request.status !== "APPROVED" && request.status !== "IN_PROGRESS") {
    return { success: false as const, error: "Only approved requests can be completed." };
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
          previousStatus: request.status,
          newStatus: "COMPLETED",
          performedById: user.id,
          maintenanceRequestId: request.id,
          propertyId: request.propertyId,
        },
      });
    });
  } catch (error) {
    console.error("Failed to complete job:", error);
    return { success: false as const, error: "Could not complete the job. Try again." };
  }

  revalidatePath("/caretaker/dashboard", "layout");
  return { success: true as const };
}
