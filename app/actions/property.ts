
"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireVerifiedUser } from "@/lib/session";
import { sendCaretakerInvitationEmail } from "@/lib/email";
import { requireOwnerOfProperty } from "@/lib/authz";

type CreatePropertyInput = {
  address: string;
  city?: string;
};

type CreatePropertyResult =
  | {
      success: true;
      data: { id: string; address: string; city: string | null };
    }
  | { success: false; error: string };

type InviteCaretakerResult =
  | { success: true; linked: boolean; message: string }
  | { success: false; error: string };

const INVITATION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function validatePropertyDetails(input: CreatePropertyInput) {
  const address =
    typeof input?.address === "string"
      ? input.address.trim()
      : "";

  const city =
    typeof input?.city === "string"
      ? input.city.trim() || null
      : null;

  if (!address) {
    return { success: false as const, error: "Address is required." };
  }

  if (address.length > 200 || (city && city.length > 100)) {
    return { success: false as const, error: "Address or city is too long." };
  }

  return { success: true as const, address, city };
}

// Only used to choose which property to open first.
// This is NOT an authorization check.
export async function getPropertyId(): Promise<string | null> {
  const user = await getCurrentUser();

  if (!user) return null;

  if (user.role === "OWNER" && !user.emailVerifiedAt) {
    return null;
  }

  const property = await prisma.property.findFirst({
    where:
      user.role === "OWNER"
        ? { ownerId: user.id }
        : { caretakerId: user.id },
    select: { id: true },
  });

  return property?.id ?? null;
}

export async function inviteCaretaker(
  propertyId: string,
  caretakerEmail: string
): Promise<InviteCaretakerResult> {
  if (
    typeof propertyId !== "string" ||
    typeof caretakerEmail !== "string"
  ) {
    return {
      success: false,
      error: "Invalid invitation information.",
    };
  }

  const email = caretakerEmail.trim().toLowerCase();

  if (!propertyId.trim()) {
    return { success: false, error: "Property is required." };
  }

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return {
      success: false,
      error: "A valid caretaker email is required.",
    };
  }

  // Authorization: verified owner who owns this property.
  const a = await requireOwnerOfProperty(propertyId);

  if (!a.ok) {
    return { success: false, error: a.error };
  }

  const owner = a.user;
  const property = a.property;

  // Defense in depth in case requireOwnerOfProperty doesn't check verification.
  if (!owner.emailVerifiedAt) {
    return {
      success: false,
      error: "Please verify your email before continuing.",
    };
  }

  if (property.caretakerId) {
    return {
      success: false,
      error: "This property already has a caretaker.",
    };
  }

  const caretaker = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (caretaker?.role === "OWNER") {
    return {
      success: false,
      error: "That account is not a caretaker.",
    };
  }

  if (caretaker) {
    const existingAssignment = await prisma.property.findFirst({
      where: { caretakerId: caretaker.id },
      select: { id: true },
    });

    if (existingAssignment) {
      return {
        success: false,
        error: "This caretaker is already assigned to a property.",
      };
    }
  }

  await prisma.invitation.updateMany({
    where: {
      propertyId: property.id,
      email,
      status: "PENDING",
      expiresAt: { lte: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      propertyId: property.id,
      email,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (existingInvitation) {
    return {
      success: true,
      linked: false,
      message: "A valid invitation already exists for this email.",
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

    const isLocalhost = ["localhost", "127.0.0.1"].includes(
      baseUrl.hostname
    );

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

  let invitation: { id: string };

  try {
    invitation = await prisma.invitation.create({
      data: {
        email,
        tokenHash,
        status: "PENDING",
        expiresAt: new Date(Date.now() + INVITATION_DURATION_MS),
        propertyId: property.id,
        invitedById: owner.id,
        emailAttempts: 1,
        lastEmailAt: new Date(),
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.invitation.findFirst({
        where: {
          propertyId: property.id,
          email,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });

      if (existing) {
        return {
          success: true,
          linked: false,
          message: "A valid invitation already exists for this email.",
        };
      }

      return {
        success: false,
        error: "Invitation could not be created. Please try again.",
      };
    }

    console.error("Failed to create caretaker invitation:", error);

    return {
      success: false,
      error: "Failed to create invitation.",
    };
  }

  try {
    await sendCaretakerInvitationEmail(email, invitationUrl);
  } catch (error) {
    console.error("Failed to send caretaker invitation email:", error);

    return {
      success: false,
      error: "Email delivery failed. Invitation saved for retry.",
    };
  }

  try {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { emailSentAt: new Date() },
    });
  } catch (error) {
    console.error("Failed to record invitation email delivery:", error);

    return {
      success: false,
      error: "Email was submitted, but delivery status could not be saved.",
    };
  }

  return {
    success: true,
    linked: false,
    message: "Invitation email sent successfully.",
  };
}

export async function createProperty(
  input: CreatePropertyInput
): Promise<CreatePropertyResult> {
  const details = validatePropertyDetails(input);
  if (!details.success) return details;
  const { address, city } = details;

  const auth = await requireVerifiedUser();

  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  if (auth.user.role !== "OWNER") {
    return {
      success: false,
      error: "Only owners can create properties.",
    };
  }

  try {
    const property = await prisma.property.create({
      data: {
        address,
        city,
        ownerId: auth.user.id,
        caretakerId: null,
      },
      select: {
        id: true,
        address: true,
        city: true,
      },
    });

    return { success: true, data: property };
  } catch (error) {
    console.error("Failed to create property:", error);

    return {
      success: false,
      error: "Failed to create property.",
    };
  }
}

export async function updateProperty(
  propertyId: string,
  input: CreatePropertyInput
): Promise<{ success: true } | { success: false; error: string }> {
  const a = await requireOwnerOfProperty(propertyId);
  if (!a.ok) return { success: false, error: a.error };

  const details = validatePropertyDetails(input);
  if (!details.success) return details;

  try {
    const updated = await prisma.property.updateMany({
      where: { id: a.property.id, ownerId: a.user.id },
      // Never pass the browser's input object to Prisma.
      data: { address: details.address, city: details.city },
    });

    if (updated.count !== 1) {
      return { success: false, error: "Not found." };
    }
  } catch (error) {
    console.error("Failed to update property:", error);
    return { success: false, error: "Failed to update property." };
  }

  revalidatePath("/");
  revalidatePath("/properties");
  revalidatePath(`/properties/${a.property.id}`, "layout");
  revalidatePath("/requests", "layout");
  revalidatePath("/caretaker/dashboard", "layout");
  revalidatePath("/activity");

  return { success: true };
}
