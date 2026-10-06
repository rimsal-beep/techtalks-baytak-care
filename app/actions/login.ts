"use server";

import { prisma } from "../../lib/prisma";
import { verifyPassword } from "../../lib/auth";
import { createSessionToken } from "../../lib/session";
import { cookies } from "next/headers";
import {
  checkRateLimit,
  resetRateLimit,
} from "../../lib/rateLimit";

type LoginInput = {
  email: string;
  password: string;
};

export async function login(input: LoginInput) {
  if (!input.email?.trim() || !input.password) {
    return { success: false, error: "Email and password are required." };
  }

  const email = input.email.trim().toLowerCase();

  const rateLimit = checkRateLimit(email);

  if (!rateLimit.allowed) {
    return {
      success: false,
      error: "Too many login attempts. Please try again later.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  const isValid = await verifyPassword(input.password, user.passwordHash);

  if (!isValid) {
    return { success: false, error: "Invalid email or password." };
  }

  resetRateLimit(email);

  const cookieStore = await cookies();

  cookieStore.set("userId", createSessionToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  const property = await prisma.property.findFirst({
    where:
      user.role === "OWNER"
        ? { ownerId: user.id }
        : { caretakerId: user.id },
    select: { id: true },
  });

  if (property) {
    cookieStore.set("propertyId", property.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return {
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      propertyId: property?.id ?? null,
    },
  };
}