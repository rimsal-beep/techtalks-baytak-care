"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireUser, requireOwnerOfProperty } from "@/lib/authz";

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

// Only for "which property do I open first". NOT a permission check.
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
  if (typeof caretakerEmail !== "string") {
    return { success: false, error: "Caretaker email is required." };
  }
  const email = caretakerEmail.trim().toLowerCase();
  if (!email || email.length > 254 || !email.includes("@")) {
    return { success: false, error: "Enter a valid email." };
  }

  // checks: logged in + OWNER + property is theirs (not found otherwise)
  const a = await requireOwnerOfProperty(propertyId);
  if (!a.ok) return { success: false, error: a.error };

  const owner = a.user;
  const property = a.property;

  const caretaker = await prisma.user.findUnique({ where: { email } });

  // Same answer whether the email is missing or is not a caretaker
  if (caretaker && caretaker.role !== "CARETAKER") {
    return {
      success: true,
      linked: false,
      message: "Invitation saved. The caretaker will be linked after signup.",
    };
  }

  if (caretaker) {
    await prisma.property.updateMany({
      where: { id: property.id, ownerId: owner.id },
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
    where: {
      propertyId: property.id,
      email,
      status: "PENDING",
      expiresAt: { gt: new Date() },
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
    typeof input?.address === "string" ? input.address.trim() : "";
  const city =
    typeof input?.city === "string" ? input.city.trim() || null : null;

  if (!address) {
    return { success: false, error: "Address is required." };
  }
  if (address.length > 200 || (city && city.length > 100)) {
    return { success: false, error: "Address or city is too long." };
  }

  // logged in + OWNER
  const a = await requireUser(["OWNER"]);
  if (!a.ok) return { success: false, error: a.error };

  try {
    const property = await prisma.property.create({
      data: {
        address,
        city,
        ownerId: a.user.id,
        caretakerId: null,
      },
      select: { id: true, address: true, city: true },
    });

    return { success: true, data: property };
  } catch (error) {
    console.error("Failed to create property:", error);
    return { success: false, error: "Failed to create property." };
  }
}