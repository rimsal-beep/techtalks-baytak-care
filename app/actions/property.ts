
"use server";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendCaretakerInvitationEmail } from "@/lib/email";
import { Prisma } from "@/generated/prisma/client";

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

export async function getPropertyId(): Promise<string | null> {
  const user = await getCurrentUser();

  if (!user) return null;

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
    return {
      success: false,
      error: "Property is required.",
    };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      success: false,
      error: "A valid caretaker email is required.",
    };
  }

  const owner = await getCurrentUser();

  if (!owner || owner.role !== "OWNER") {
    return {
      success: false,
      error: "Only property owners can invite caretakers.",
    };
  }

  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      ownerId: owner.id,
    },
    select: {
      id: true,
      caretakerId: true,
    },
  });

  if (!property) {
    return {
      success: false,
      error: "Property not found.",
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
    select: {
      id: true,
      role: true,
    },
  });

  if (caretaker?.role === "OWNER") {
    return {
      success: false,
      error: "That account is not a caretaker.",
    };
  }

  if (caretaker) {
    const existingAssignment = await prisma.property.findFirst({
      where: {
        caretakerId: caretaker.id,
      },
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
  data: {
    status: "EXPIRED",
  },
});

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      propertyId: property.id,
      email,
      status: "PENDING",
      expiresAt: {
        gt: new Date(),
      },
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

  const tokenHash = createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const invitationUrl = new URL(
    `/invite/${rawToken}`,
    baseUrl
  ).toString();

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
      select: {
        id: true,
      },
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
      where: {
        id: invitation.id,
      },
      data: {
        emailSentAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to record invitation email delivery:", error);

    return {
      success: false,
      error:
        "Email was submitted, but delivery status could not be saved.",
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
  const address =
    typeof input.address === "string" ? input.address.trim() : "";

  const city =
    typeof input.city === "string"
      ? input.city.trim() || null
      : null;

  if (!address) {
    return {
      success: false,
      error: "Address is required.",
    };
  }

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
      error: "Only property owners can add properties.",
    };
  }

  try {
    const property = await prisma.property.create({
      data: {
        address,
        city,
        ownerId: user.id,
        caretakerId: null,
      },
      select: {
        id: true,
        address: true,
        city: true,
      },
    });

    return {
      success: true,
      data: property,
    };
  } catch (error) {
    console.error("Failed to create property:", error);

    return {
      success: false,
      error: "Failed to create property.",
    };
  }
}
