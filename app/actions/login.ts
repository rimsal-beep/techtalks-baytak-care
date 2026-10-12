
"use server";

import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/auth";
import { createSessionToken } from "../../lib/session";
import { cookies } from "next/headers";
import {
  checkRateLimit,
  resetRateLimit,
} from "../../lib/rateLimit";
import { redirect } from "next/navigation";

export type LoginState = {
  error: string;
};

// A missing account gets the same slow password check as a wrong password.
const DUMMY_HASH = hashPassword("not-a-real-password");

const INVALID = {
  error: "Invalid email or password.",
};

export async function login(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email =
    typeof emailValue === "string"
      ? emailValue.trim().toLowerCase()
      : "";

  const password =
    typeof passwordValue === "string"
      ? passwordValue
      : "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (email.length > 254 || password.length > 128) {
    return INVALID;
  }

  const rateLimit = checkRateLimit(email);

  if (!rateLimit.allowed) {
    return { error: "Too many login attempts. Please try again later." };
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

  // Owners must verify their email before receiving a session.
  if (user.role === "OWNER" && !user.emailVerifiedAt) {
    return { error: "Please verify your email before logging in." };
  }

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

  const nextValue = formData.get("next");
  const nextPath =
    typeof nextValue === "string" &&
    /^\/invite\/[a-f0-9]{64}$/.test(nextValue)
      ? nextValue
      : null;

  redirect(
    user.role === "CARETAKER"
      ? nextPath ?? "/caretaker/dashboard"
      : "/"
  );
}
