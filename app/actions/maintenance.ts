"use server";

import { prisma } from "../../lib/prisma";

type CreateMaintenanceRequestInput = {
  title: string;
  description?: string;
  requestType: string;
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

  try {
    const maintenanceRequest = await prisma.maintenanceRequest.create({
      data: {
        title: input.title.trim(),
        requestType: input.requestType.trim(),
        description: input.description?.trim() || null,
        propertyId: input.propertyId,
      },
    });

    return {
      success: true,
      data: maintenanceRequest,
    };
  } catch (error) {
    console.error("Failed to create maintenance request:", error);

    return {
      success: false,
      error: "Failed to create maintenance request.",
    };
  }
}