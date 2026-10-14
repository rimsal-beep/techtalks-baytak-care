"use server";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendCaretakerInvitationEmail } from "@/lib/email";
import { getCurrentUser, requireVerifiedUser } from "@/lib/session";
import { isId, requireUser, lockActiveProperty } from "@/lib/authz";

type ActionResult =
  | { success: true; message: string; propertyId?: string }
  | { success: false; error: string };

export async function acceptInvitation(token: string): Promise<ActionResult> {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return { success: false, error: "Invalid invitation link." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Please sign in first." };
  }

  if (user.role !== "CARETAKER") {
    return {
      success: false,
      error: "Only caretaker accounts can accept invitations.",
    };
  }

  if (!user.emailVerifiedAt) {
    return {
      success: false,
      error: "Please verify your email before accepting an invitation.",
    };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    return await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          email: true,
          propertyId: true,
          status: true,
          expiresAt: true,
        },
      });

      if (
        !invitation ||
        invitation.status !== "PENDING" ||
        invitation.expiresAt <= new Date()
      ) {
        return {
          success: false,
          error: "This invitation is invalid or expired.",
        };
      }

      if (invitation.email.toLowerCase() !== user.email.trim().toLowerCase()) {
        return {
          success: false,
          error: "This invitation belongs to another email address.",
        };
      }
 await tx.$queryRaw`
        SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE
      `;

      const alreadyAssigned = await tx.property.findFirst({
        where: { caretakerId: user.id, deletedAt: null },
        select: { id: true },
      });

      if (alreadyAssigned) {
        return {
          success: false,
          error:
            "You already look after a property. A caretaker can only be assigned to one property at a time.",
        };
      }
      const property = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "Property"
        WHERE "id" = ${invitation.propertyId}
          AND "deletedAt" IS NULL
          AND "caretakerId" IS NULL
        FOR UPDATE
      `;

      if (property.length !== 1) {
        throw new Error("PROPERTY_UNAVAILABLE");
      }

      const accepted = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          tokenHash,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      if (accepted.count !== 1) {
        throw new Error("Invitation already used or expired.");
      }

      const assignment = await tx.property.updateMany({
        where: {
          id: invitation.propertyId,
          caretakerId: null,
          deletedAt: null,
        },
        data: {
          caretakerId: user.id,
        },
      });

      if (assignment.count !== 1) {
        throw new Error("Property already has a caretaker.");
      }

      return {
        success: true,
        message: "Invitation accepted successfully.",
        propertyId: invitation.propertyId,
      };
    });
  } catch {
    return {
      success: false,
      error:
        "Unable to accept invitation. It may already be used, expired, or the property may already have a caretaker.",
    };
  }
}

export async function declineInvitation(token: string): Promise<ActionResult> {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return { success: false, error: "Invalid invitation link." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Please sign in first." };
  }

  if (user.role !== "CARETAKER") {
    return {
      success: false,
      error: "Only caretaker accounts can decline invitations.",
    };
  }

  if (!user.emailVerifiedAt) {
    return {
      success: false,
      error: "Please verify your email before declining an invitation.",
    };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { tokenHash },
        select: { id: true, propertyId: true },
      });

      if (!invitation) {
        return { count: 0 };
      }

      // Use the same property lock as invitation acceptance.
      const property = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "Property"
        WHERE "id" = ${invitation.propertyId}
          AND "deletedAt" IS NULL
          AND "caretakerId" IS NULL
        FOR UPDATE
      `;

      if (property.length !== 1) {
        return { count: 0 };
      }

      return tx.invitation.updateMany({
        where: {
          id: invitation.id,
          tokenHash,
          email: {
            equals: user.email.trim(),
            mode: "insensitive",
          },
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        data: {
          status: "DECLINED",
        },
      });
    });

    if (result.count !== 1) {
      return {
        success: false,
        error: "Invitation is invalid, expired, or already handled.",
      };
    }

    return {
      success: true,
      message: "Invitation declined successfully.",
    };
  } catch {
    return {
      success: false,
      error: "Unable to decline invitation.",
    };
  }
}

export async function getInvitationPreview(token: string) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return { success: false as const, error: "Invalid invitation link." };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
    select: {
      status: true,
      expiresAt: true,
      invitedBy: {
        select: { name: true },
      },
      property: {
        select: {
          city: true,
          deletedAt: true,
          caretakerId: true,
        },
      },
    },
  });

  if (
    !invitation ||
    invitation.status !== "PENDING" ||
    invitation.expiresAt <= new Date() ||
    invitation.property.deletedAt !== null ||
    invitation.property.caretakerId !== null
  ) {
    return {
      success: false as const,
      error: "This invitation is invalid, expired, or no longer available.",
    };
  }

  return {
    success: true as const,
    preview: {
      ownerName: invitation.invitedBy.name,
      location: invitation.property.city ?? "Location not specified",
      expiresAt: invitation.expiresAt.toISOString(),
    },
  };
}

export async function revokeInvitation(
  invitationId: string,
): Promise<ActionResult> {
  const auth = await requireUser(["OWNER"]);

  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  if (!isId(invitationId) || !invitationId.trim()) {
    return { success: false, error: "Invalid invitation." };
  }

  try {
    const now = new Date();
    // Ownership and lifecycle checks belong in the write itself.
    // A concurrent accept, revoke, or expiry cannot transition this row twice.
    const revoked = await prisma.invitation.updateMany({
      where: {
        id: invitationId,
        property: { ownerId: auth.user.id, deletedAt: null },
        status: "PENDING",
        expiresAt: { gt: now },
      },
      data: {
        status: "REVOKED",
        revokedAt: now,
      },
    });

    if (revoked.count !== 1) {
      return {
        success: false,
        error:
          "Invitation unavailable. It may have already changed or expired.",
      };
    }

    return { success: true, message: "Invitation revoked successfully." };
  } catch {
    return { success: false, error: "Failed to revoke invitation." };
  }
}

export async function removeCaretaker(
  propertyId: string,
): Promise<ActionResult> {
  const auth = await requireVerifiedUser();

  if (!auth.success || auth.user.role !== "OWNER") {
    return {
      success: false,
      error: "Only verified owners can remove caretakers.",
    };
  }

  if (typeof propertyId !== "string" || !propertyId.trim()) {
    return { success: false, error: "Invalid property." };
  }

  try {
    const result = await prisma.property.updateMany({
      where: {
        id: propertyId,
        ownerId: auth.user.id,
        deletedAt: null,
        caretakerId: { not: null },
      },
      data: { caretakerId: null },
    });

    if (result.count !== 1) {
      return {
        success: false,
        error: "Property not found or no caretaker assigned.",
      };
    }

    return {
      success: true,
      message: "Caretaker removed successfully.",
    };
  } catch {
    return {
      success: false,
      error: "Failed to remove caretaker.",
    };
  }
}

export async function resendInvitation(
  propertyId: string,
  emailInput: string,
): Promise<ActionResult> {
  const auth = await requireVerifiedUser();

  if (!auth.success || auth.user.role !== "OWNER") {
    return {
      success: false,
      error: "Only verified owners can resend invitations.",
    };
  }

  const owner = auth.user;

  if (typeof propertyId !== "string" || typeof emailInput !== "string") {
    return { success: false, error: "Invalid invitation details." };
  }

  const email = emailInput.trim().toLowerCase();

  if (!propertyId.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Invalid property or email." };
  }

  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      ownerId: owner.id,
      deletedAt: null,
    },
    select: { caretakerId: true },
  });

  if (!property || property.caretakerId) {
    return {
      success: false,
      error: "Property unavailable for invitations.",
    };
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      propertyId,
      email,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!invitation) {
    return { success: false, error: "No active invitation found." };
  }

  const now = new Date();
  const cooldownMs = 60_000;

  if (
    invitation.lastEmailAt &&
    now.getTime() - invitation.lastEmailAt.getTime() < cooldownMs
  ) {
    return {
      success: false,
      error: "Wait one minute before resending.",
    };
  }

  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    return {
      success: false,
      error: "Application URL is not configured.",
    };
  }

  let baseUrl: URL;

  try {
    baseUrl = new URL(appUrl);

    const isLocalhost = ["localhost", "127.0.0.1"].includes(baseUrl.hostname);

    if (
      (baseUrl.protocol !== "https:" &&
        !(baseUrl.protocol === "http:" && isLocalhost)) ||
      baseUrl.username ||
      baseUrl.password
    ) {
      throw new Error("Invalid application URL.");
    }
  } catch {
    return {
      success: false,
      error: "Invalid application URL configuration.",
    };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const invitationUrl = new URL(`/invite/${rawToken}`, baseUrl).toString();

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await lockActiveProperty(tx, propertyId, owner);
      return tx.invitation.updateMany({
        where: {
          id: invitation.id,
          property: { ownerId: owner.id, deletedAt: null, caretakerId: null },
          status: "PENDING",
          tokenHash: invitation.tokenHash,
          expiresAt: { gt: now },
          OR: [
            { lastEmailAt: null },
            {
              lastEmailAt: {
                lt: new Date(now.getTime() - cooldownMs),
              },
            },
          ],
        },
        data: {
          tokenHash,
          lastEmailAt: now,
          emailAttempts: { increment: 1 },
          emailSentAt: null,
        },
      });
    });
    if (updated.count !== 1) {
      return {
        success: false,
        error: "Invitation changed. Please retry.",
      };
    }

    try {
      await sendCaretakerInvitationEmail(email, invitationUrl);
    } catch {
      return {
        success: false,
        error: "Email submission failed. You can retry after one minute.",
      };
    }

    await prisma.invitation.updateMany({
      where: {
        id: invitation.id,
        tokenHash,
        status: "PENDING",
        property: { ownerId: owner.id, deletedAt: null },
      },
      data: { emailSentAt: new Date() },
    });

    return {
      success: true,
      message: "New invitation email submitted.",
    };
  } catch {
    return {
      success: false,
      error: "Failed to resend invitation.",
    };
  }
}
