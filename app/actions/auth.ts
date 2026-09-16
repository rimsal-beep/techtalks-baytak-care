"use server";

import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/auth";

type SignupInput = {
  email: string;
  password: string;
  role: "OWNER" | "CARETAKER";
  propertyId: string;
};

export async function signup(input: SignupInput) {
  if (!input.email?.trim()) {
    return { success: false, error: "Email is required." };
  }
  if (!input.password || input.password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }
  if (!input.propertyId?.trim()) {
    return { success: false, error: "Property is required." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existingUser) {
    return { success: false, error: "An account with this email already exists." };
  }

  try {
    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email.trim(),
        passwordHash,
        role: input.role,
        propertyId: input.propertyId,
      },
    });
    return { success: true, data: { id: user.id, email: user.email, role: user.role } };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { success: false, error: "Failed to create account." };
  }
}