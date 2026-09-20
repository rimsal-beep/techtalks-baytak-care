"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

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
    where: user.role === "OWNER"
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
  const email = caretakerEmail.trim().toLowerCase();

  if (!propertyId) return { success: false, error: "Property is required." };
  if (!email) {
    return { success: false, error: "Caretaker email is required." };
  }

  const owner = await getCurrentUser();
  if (!owner || owner.role !== "OWNER") {
    return { success: false, error: "Only owners can invite caretakers." };
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: owner.id },
    select: { id: true },
  });

  if (!property) return { success: false, error: "Property not found." };

  const caretaker = await prisma.user.findUnique({ where: { email } });

  if (caretaker?.role === "OWNER") {
    return { success: false, error: "That account is not a caretaker." };
  }

  if (caretaker) {
    await prisma.property.update({
      where: { id: property.id },
      data: { caretakerId: caretaker.id },
    });

    await prisma.invitation.updateMany({
      where: { propertyId: property.id, email, status: "PENDING" },
      data: { status: "ACCEPTED" },
    });

    return {
      success: true,
      linked: true,
      message: "Caretaker linked to the property.",
    };
  }

  const pendingInvitation = await prisma.invitation.findFirst({
    where: { propertyId: property.id, email, status: "PENDING" },
  });

  if (pendingInvitation) {
    return {
      success: true,
      linked: false,
      message: "An invitation is already pending for this email.",
    };
  }

  await prisma.invitation.create({
    data: {
      email,
      token: crypto.randomUUID(),
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
}

export async function createProperty(
  input: CreatePropertyInput
): Promise<CreatePropertyResult> {
  const address =
    typeof input.address === "string" ? input.address.trim() : "";
  const city = typeof input.city === "string" ? input.city.trim() || null : null;

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
    return { success: false, error: "Failed to create property." };
  }
}
