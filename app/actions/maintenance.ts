"use server";

import { prisma } from "../../lib/prisma";
import { getCurrentUser } from "../../lib/session";

type CreateMaintenanceRequestInput = {
  title: string;
  description?: string;
  requestType: string;
  estimatedCost?: number;
  currency?: "USD" | "LBP";
  estimateNote?: string;
  propertyId: string;
};

export async function createMaintenanceRequest(
  input: CreateMaintenanceRequestInput
) {
  if (!input.title?.trim()) {
    return {
      success: false,
      error: "Title is required.",
    };
  }

  if (!input.requestType?.trim()) {
    return {
      success: false,
      error: "Request type is required.",
    };
  }

  if (!input.propertyId?.trim()) {
    return {
      success: false,
      error: "Property ID is required.",
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      error: "Not logged in.",
    };
  }

  const property = await prisma.property.findUnique({
    where: { id: input.propertyId },
    select: {
      ownerId: true,
      caretakerId: true,
    },
  });

  if (!property) {
    return {
      success: false,
      error: "Property not found.",
    };
  }

  const isAuthorized =
    property.ownerId === user.id || property.caretakerId === user.id;

  if (!isAuthorized) {
    return {
      success: false,
      error: "Not authorized for this property.",
    };
  }

  try {
    const estimatedCost = input.estimatedCost ?? null;

    if (
      estimatedCost !== null &&
      (!Number.isFinite(estimatedCost) || estimatedCost < 0)
    ) {
      return {
        success: false,
        error: "Estimated cost must be a valid non-negative number.",
      };
    }

    const maintenanceRequest = await prisma.maintenanceRequest.create({
      data: {
        title: input.title.trim(),
        requestType: input.requestType.trim() as
          | "PLUMBING"
          | "ELECTRICAL"
          | "HVAC"
          | "STRUCTURAL"
          | "APPLIANCE"
          | "PAINTING"
          | "CLEANING"
          | "OTHER",
        description: input.description?.trim() || null,
        estimatedCost,
        currency: input.currency ?? "USD",
        estimateNote: input.estimateNote?.trim() || null,
        issuePhotoUrls: [],
        reportedById: user.id,
        propertyId: input.propertyId,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to create maintenance request:", error);

    return {
      success: false,
      error: "Failed to create maintenance request.",
    };
  }
}