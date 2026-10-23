
"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendCaretakerInvitationEmail } from "@/lib/email";
import { getCurrentUser, requireVerifiedUser } from "@/lib/session";
import { isId, requireUser, lockActiveProperty } from "@/lib/authz";

type ActionResult =
  | { success: true; message: string; propertyId?: string }
  | { success: false; error: string };

const INVITATION_TOKEN_REGEX = /^[a-f0-9]{64}$/;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getInvitationUrl(token: string): string | null {
  const appUrl = process.env.APP_URL;

  if (!appUrl) return null;

  try {
    const baseUrl = new URL(appUrl);
    const isLocalhost = ["localhost", "127.0.0.1"].includes(
      baseUrl.hostname,
    );

    if (
      (baseUrl.protocol !== "https:" &&
        !(baseUrl.protocol === "http:" && isLocalhost)) ||
      baseUrl.username ||
      baseUrl.password
    ) {
      return null;
    }

    return new URL(`/invite/${token}`, baseUrl).toString();
  } catch {
    return null;
  }
}

function refreshProperty(propertyId: string) {
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/caretaker`);
  revalidatePath("/caretaker/dashboard");
  revalidatePath("/properties");
}

export async function acceptInvitation(
  token: string,
): Promise<ActionResult> {
  if (typeof token !== "string" || !INVITATION_TOKEN_REGEX.test(token)) {
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

  const tokenHash = hashToken(token);

  try {
    const result: ActionResult = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          email: true,
          propertyId: true,
          expectedCaretakerId: true,
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

      if (
        invitation.email.trim().toLowerCase() !==
        user.email.trim().toLowerCase()
      ) {
        return {
          success: false,
          error: "This invitation belongs to another email address.",
        };
      }

      // Serialize assignments for the accepting caretaker.
      await tx.$queryRaw`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${user.id}
        FOR UPDATE
      `;

      const alreadyAssigned = await tx.property.findFirst({
        where: {
          caretakerId: user.id,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (alreadyAssigned) {
        return {
          success: false,
          error:
            "You already look after a property. A caretaker can only be assigned to one property at a time.",
        };
      }

      // Lock the property even if another caretaker is assigned.
      const properties = await tx.$queryRaw<
        { id: string; caretakerId: string | null }[]
      >`
        SELECT "id", "caretakerId"
        FROM "Property"
        WHERE "id" = ${invitation.propertyId}
          AND "deletedAt" IS NULL
        FOR UPDATE
      `;

      if (properties.length !== 1) {
        return {
          success: false,
          error: "This property is no longer available.",
        };
      }

      const property = properties[0];

      // Reject invitations created before a change of caretaker.
      // Legacy null snapshots can only be used on unassigned properties.
      if (property.caretakerId !== invitation.expectedCaretakerId) {
        return {
          success: false,
          error:
            "The property's caretaker has changed since this invitation was sent. Please request a new invitation.",
        };
      }

      const now = new Date();

      const accepted = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          tokenHash,
          status: "PENDING",
          expiresAt: { gt: now },
        },
        data: {
          status: "ACCEPTED",
          acceptedAt: now,
        },
      });

      if (accepted.count !== 1) {
        throw new Error("INVITATION_UNAVAILABLE");
      }

      const assignment = await tx.property.updateMany({
        where: {
          id: invitation.propertyId,
          caretakerId: invitation.expectedCaretakerId,
          deletedAt: null,
        },
        data: {
          caretakerId: user.id,
        },
      });

      if (assignment.count !== 1) {
        throw new Error("ASSIGNMENT_CHANGED");
      }

      // A successful assignment invalidates competing invitations.
      await tx.invitation.updateMany({
        where: {
          propertyId: invitation.propertyId,
          id: { not: invitation.id },
          status: "PENDING",
        },
        data: {
          status: "REVOKED",
          revokedAt: now,
        },
      });

      return {
        success: true,
        message: "Invitation accepted successfully.",
        propertyId: invitation.propertyId,
      };
    });

    if (result.success && result.propertyId) {
      refreshProperty(result.propertyId);
    }

    return result;
  } catch (error) {
    console.error("Failed to accept caretaker invitation:", error);

    return {
      success: false,
      error: "Unable to accept invitation. Please try again.",
    };
  }
}

export async function declineInvitation(
  token: string,
): Promise<ActionResult> {
  if (typeof token !== "string" || !INVITATION_TOKEN_REGEX.test(token)) {
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

  const tokenHash = hashToken(token);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          propertyId: true,
          email: true,
        },
      });

      if (!invitation) {
        return { count: 0, propertyId: null as string | null };
      }

      if (
        invitation.email.trim().toLowerCase() !==
        user.email.trim().toLowerCase()
      ) {
        return { count: 0, propertyId: null as string | null };
      }

      const properties = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "Property"
        WHERE "id" = ${invitation.propertyId}
          AND "deletedAt" IS NULL
        FOR UPDATE
      `;

      if (properties.length !== 1) {
        return { count: 0, propertyId: null as string | null };
      }

      const updated = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          tokenHash,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        data: {
          status: "DECLINED",
        },
      });

      return {
        count: updated.count,
        propertyId: invitation.propertyId,
      };
    });

    if (result.count !== 1 || !result.propertyId) {
      return {
        success: false,
        error: "Invitation is invalid, expired, or already handled.",
      };
    }

    refreshProperty(result.propertyId);

    return {
      success: true,
      message: "Invitation declined successfully.",
    };
  } catch (error) {
    console.error("Failed to decline caretaker invitation:", error);

    return {
      success: false,
      error: "Unable to decline invitation.",
    };
  }
}

export async function getInvitationPreview(token: string) {
  if (typeof token !== "string" || !INVITATION_TOKEN_REGEX.test(token)) {
    return { success: false as const, error: "Invalid invitation link." };
  }

  const tokenHash = hashToken(token);

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
    select: {
      status: true,
      expiresAt: true,
      expectedCaretakerId: true,
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
    invitation.property.caretakerId !== invitation.expectedCaretakerId
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

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        property: {
          ownerId: auth.user.id,
          deletedAt: null,
        },
      },
      select: { propertyId: true },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found." };
    }

    const revoked = await prisma.invitation.updateMany({
      where: {
        id: invitationId,
        property: {
          ownerId: auth.user.id,
          deletedAt: null,
        },
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
        error: "Invitation unavailable. It may already be handled or expired.",
      };
    }

    refreshProperty(invitation.propertyId);

    return {
      success: true,
      message: "Invitation revoked successfully.",
    };
  } catch {
    return {
      success: false,
      error: "Failed to revoke invitation.",
    };
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
    const result = await prisma.$transaction(async (tx) => {
      await lockActiveProperty(tx, propertyId, auth.user);

      const removed = await tx.property.updateMany({
        where: {
          id: propertyId,
          ownerId: auth.user.id,
          deletedAt: null,
          caretakerId: { not: null },
        },
        data: { caretakerId: null },
      });

      if (removed.count !== 1) {
        return { count: 0 };
      }

      // Invalidate invitations based on the previous assignment.
      await tx.invitation.updateMany({
        where: {
          propertyId,
          status: "PENDING",
        },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
        },
      });

      return { count: 1 };
    });

    if (result.count !== 1) {
      return {
        success: false,
        error: "Property not found or no caretaker assigned.",
      };
    }

    refreshProperty(propertyId);

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

  if (
    !propertyId.trim() ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { success: false, error: "Invalid property or email." };
  }

  const caretaker = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (caretaker && caretaker.role !== "CARETAKER") {
    return {
      success: false,
      error: "This email belongs to an OWNER account, not a caretaker.",
    };
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      propertyId,
      email,
      status: "PENDING",
      expiresAt: { gt: new Date() },
      property: {
        ownerId: owner.id,
        deletedAt: null,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!invitation) {
    return {
      success: false,
      error: "No active invitation found.",
    };
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

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const invitationUrl = getInvitationUrl(rawToken);

  if (!invitationUrl) {
    return {
      success: false,
      error: "Application URL is not configured correctly.",
    };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await lockActiveProperty(tx, propertyId, owner);

      const property = await tx.property.findFirst({
        where: {
          id: propertyId,
          ownerId: owner.id,
          deletedAt: null,
        },
        select: { caretakerId: true },
      });

      if (
        !property ||
        (caretaker && property.caretakerId === caretaker.id) ||
        property.caretakerId !== invitation.expectedCaretakerId
      ) {
        return { count: 0 };
      }

      return tx.invitation.updateMany({
        where: {
          id: invitation.id,
          propertyId,
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
        error:
          "Invitation or caretaker assignment changed. Please create a new invitation.",
      };
    }

    try {
      await sendCaretakerInvitationEmail(email, invitationUrl);
    } catch (error) {
      console.error("Failed to resend invitation email:", error);

      await prisma.invitation.updateMany({
        where: { id: invitation.id, tokenHash, status: "PENDING" },
        data: { status: "REVOKED", revokedAt: new Date() },
      }).catch((revokeError) => {
        console.error("Failed to revoke unsent invitation:", revokeError);
      });

      return {
        success: false,
        error: "Email submission failed. This invitation was revoked; please send a new invitation.",
      };
    }

    await prisma.invitation.updateMany({
      where: {
        id: invitation.id,
        tokenHash,
        status: "PENDING",
        property: {
          ownerId: owner.id,
          deletedAt: null,
        },
      },
      data: {
        emailSentAt: new Date(),
      },
    });

    refreshProperty(propertyId);

    return {
      success: true,
      message: "New invitation email accepted by the email server.",
    };
  } catch (error) {
    console.error("Failed to resend caretaker invitation:", error);

    return {
      success: false,
      error: "Failed to resend invitation.",
    };
  }
}
