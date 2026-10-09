"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRequestAccess } from "@/lib/authz";
import { saveUpload } from "@/lib/uploads";

/**
 * Actions for the "Complete the job" form on the caretaker request page.
 */

const MAX_BYTES = 5 * 1024 * 1024; // same limit as the report form
const MAX_COST = 1_000_000_000;

// After PR #59 is merged (start work), change this to ["IN_PROGRESS"] only.
const COMPLETABLE: string[] = ["APPROVED", "IN_PROGRESS"];

/** Saves ONE file privately and returns its URL. */
export async function uploadJobFile(formData: FormData) {
  const a = await requireUser(["CARETAKER"]);
  if (!a.ok) return { success: false as const, error: a.error };

  // A caretaker with no property has no reason to upload anything
  const assigned = await prisma.property.count({
    where: { caretakerId: a.user.id },
  });
  if (assigned === 0) return { success: false as const, error: "Not allowed." };

  if (!(formData instanceof FormData)) {
    return { success: false as const, error: "No file received." };
  }

  const file = formData.get("file");
  const kind = formData.get("kind"); // "photo" or "receipt"
  if (!(file instanceof File) || file.size === 0) {
    return { success: false as const, error: "No file received." };
  }

  try {
    // real file type is read from the bytes, saved outside /public
    const saved = await saveUpload(file, {
      allowPdf: kind === "receipt",
      maxBytes: MAX_BYTES,
    });
    if (!saved.ok) return { success: false as const, error: saved.error };

    return { success: true as const, url: saved.url };
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

/** A saved upload ("/uploads/x.jpg") or an https link. Nothing else. */
function cleanUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (/^\/uploads\/[A-Za-z0-9-]+\.(jpg|png|webp|gif|pdf)$/.test(v)) return v;
  if (/^https:\/\/\S+$/i.test(v) && v.length < 2000) return v;
  return null;
}

/** Marks an approved request as completed, with final cost, photos and receipt. */
export async function completeJob(input: CompleteJobInput) {
  const cost = input?.actualCost;
  if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0 || cost > MAX_COST) {
    return { success: false as const, error: "Enter a valid final cost." };
  }

  if (!Array.isArray(input.beforePhotoUrls) || !Array.isArray(input.afterPhotoUrls)) {
    return { success: false as const, error: "One of the files or links is not valid." };
  }

  const before = input.beforePhotoUrls.map(cleanUrl);
  const after = input.afterPhotoUrls.map(cleanUrl);
  const receipt = cleanUrl(input.receiptUrl);
  if (before.some((u) => !u) || after.some((u) => !u) || !receipt) {
    return { success: false as const, error: "One of the files or links is not valid." };
  }
  if (after.length === 0) return { success: false as const, error: "Add at least one after photo." };
  if (before.length > 10 || after.length > 10) return { success: false as const, error: "Up to 10 photos each." };

  // logged in + CARETAKER + the request is on THEIR property (not found otherwise)
  const a = await requireRequestAccess(input?.requestId, "CARETAKER");
  if (!a.ok) return { success: false as const, error: a.error };
  const { user, request } = a;

  if (!COMPLETABLE.includes(request.status)) {
    return { success: false as const, error: "Only approved requests can be completed." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // The status and the owner relation are in the where again,
      // so a double tap or a stale page cannot complete it twice.
      const done = await tx.maintenanceRequest.updateMany({
        where: {
          id: request.id,
          status: { in: ["APPROVED", "IN_PROGRESS"] },
          property: { caretakerId: user.id },
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          actualCost: cost,
          beforePhotoUrls: before as string[],
          afterPhotoUrls: after as string[],
          receiptUrl: receipt,
        },
      });
      if (done.count !== 1) throw new Error("JOB_CONFLICT");

      await tx.activityLog.create({
        data: {
          action: "Request completed",
          previousStatus: request.status as "APPROVED" | "IN_PROGRESS",
          newStatus: "COMPLETED",
          performedById: user.id,
          maintenanceRequestId: request.id,
          propertyId: request.propertyId,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "JOB_CONFLICT") {
      return { success: false as const, error: "This request has already changed." };
    }
    console.error("Failed to complete job:", error);
    return { success: false as const, error: "Could not complete the job. Try again." };
  }

  revalidatePath("/caretaker/dashboard", "layout");
  return { success: true as const };
}