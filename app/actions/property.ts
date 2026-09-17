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
