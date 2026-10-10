
"use server";

import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/auth";
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

// A real hash, created once. A missing account does the same slow check
// as a wrong password, so the time does not reveal which emails exist.
const DUMMY_HASH = hashPassword("not-a-real-password");

const INVALID = {
  success: false as const,
  error: "Invalid email or password.",
};

export async function login(input: LoginInput) {
  const email =
    typeof input?.email === "string"
      ? input.email.trim().toLowerCase()
      : "";

  const password =
    typeof input?.password === "string"
      ? input.password
      : "";

  if (!email || !password) {
    return {
      success: false as const,
      error: "Email and password are required.",
    };
  }

  if (email.length > 254 || password.length > 128) {
    return INVALID;
  }

  const rateLimit = checkRateLimit(email);

  if (!rateLimit.allowed) {
    return {
      success: false as const,
      error: "Too many login attempts. Please try again later.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    await verifyPassword(password, await DUMMY_HASH);
    return INVALID;
  }

  const isValid = await verifyPassword(
    password,
    user.passwordHash
  );

  if (!isValid) {
    return INVALID;
  }

  // TODO (Task 1): refuse login until the email is verified.

  resetRateLimit(email);

  const cookieStore = await cookies();

  cookieStore.set("userId", createSessionToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  // Remove the old propertyId cookie.
  cookieStore.delete("propertyId");

  // Get the user's property from the database.
  const property = await prisma.property.findFirst({
    where:
      user.role === "OWNER"
        ? { ownerId: user.id }
        : { caretakerId: user.id },
    select: { id: true },
  });

  return {
    success: true as const,
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      propertyId: property?.id ?? null,
    },
  };
}
