"use server";

import { prisma } from "../../lib/prisma";
import { verifyPassword } from "../../lib/auth";
import { cookies } from "next/headers";

type LoginInput = {
  email: string;
  password: string;
};

export async function login(input: LoginInput) {
  if (!input.email?.trim() || !input.password) {
    return { success: false, error: "Email and password are required." };
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email.trim() },
  });

  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  const isValid = await verifyPassword(input.password, user.passwordHash);

  if (!isValid) {
    return { success: false, error: "Invalid email or password." };
  }

  const cookieStore = await cookies();
  cookieStore.set("userId", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return {
    success: true,
    data: { id: user.id, email: user.email, role: user.role, propertyId: user.propertyId },
  };
}