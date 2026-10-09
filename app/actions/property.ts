
"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { isUniqueConstraintError } from "@/lib/idempotency";

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
  if (typeof propertyId !== "string" || !propertyId.trim()) {
    return { success: false, error: "Property is required." };
  }

  if (typeof caretakerEmail !== "string") {
    return { success: false, error: "A valid caretaker email is required." };
  }

  const email = caretakerEmail.trim().toLowerCase();

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { success: false, error: "Enter a valid caretaker email." };
  }

  const owner = await getCurrentUser();

  if (!owner || owner.role !== "OWNER") {
    return {
      success: false,
      error: "Only owners can invite caretakers.",
    };
  }

  const property = await prisma.property.findFirst({
    where: {
      id: propertyId.trim(),
      ownerId: owner.id,
    },
    select: { id: true },
  });

  if (!property) {
    return { success: false, error: "Property not found." };
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

  // Existing caretaker account: link the property and accept any
  // matching pending invitation in the same transaction.
  if (caretaker) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.property.update({
          where: { id: property.id },
          data: { caretakerId: caretaker.id },
        });

        await tx.invitation.updateMany({
          where: {
            propertyId: property.id,
            email,
            status: "PENDING",
          },
          data: { status: "ACCEPTED" },
        });
      });

      return {
        success: true,
        linked: true,
        message: "Caretaker linked to the property.",
      };
    } catch (error) {
      console.error("Failed to link caretaker:", error);

      return {
        success: false,
        error: "Could not link the caretaker. Please try again.",
      };
    }
  }

  // Fast path for an invitation that already exists.
  const pendingInvitation = await prisma.invitation.findFirst({
    where: {
      propertyId: property.id,
      email,
      status: "PENDING",
    },
    select: { id: true },
  });

  if (pendingInvitation) {
    return {
      success: true,
      linked: false,
      message: "An invitation is already pending for this email.",
    };
  }

  try {
    await prisma.invitation.create({
      data: {
        email,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        propertyId: property.id,
        invitedById: owner.id,
      },
    });

    return {
      success: true,
      linked: false,
      message: "Invitation saved. The caretaker will be linked after signup.",
    };
  } catch (error) {
    // Another simultaneous request may have inserted the invitation first.
    if (isUniqueConstraintError(error)) {
      const existing = await prisma.invitation.findFirst({
        where: {
          propertyId: property.id,
          email,
          status: "PENDING",
        },
        select: { id: true },
      });

      if (existing) {
        return {
          success: true,
          linked: false,
          message: "An invitation is already pending for this email.",
        };
      }
    }

    console.error("Failed to create caretaker invitation:", error);

    return {
      success: false,
      error: "Could not create the invitation. Please try again.",
    };
  }
}

export async function createProperty(
  input: CreatePropertyInput
): Promise<CreatePropertyResult> {
  const address =
    typeof input?.address === "string" ? input.address.trim() : "";

  const city =
    typeof input?.city === "string" ? input.city.trim() || null : null;

  if (!address) {
    return { success: false, error: "Address is required." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
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

    return { success: true, data: property };
  } catch (error) {
    console.error("Failed to create property:", error);

    return {
      success: false,
      error: "Failed to create property.",
    };
  }
}
