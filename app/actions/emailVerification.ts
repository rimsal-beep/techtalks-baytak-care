"use server";

import { prisma } from "@/lib/prisma";
import {
  verifyEmailToken,
  sendVerificationEmail,
} from "@/lib/emailVerification";
import { allowResendAttempt } from "@/lib/signupGuards";
import { cookies } from "next/headers";

type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

const NEUTRAL_MESSAGE =
  "If an account needs verification, instructions will be sent.";

const invitePathRegex = /^\/invite\/[a-f0-9]{64}$/;

export async function verifyEmail(token: string): Promise<ActionResult> {
  const result = await verifyEmailToken(token);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  // Never leave an old login in the browser after a verification link.
  // The person must log in as the account they just verified.
  const cookieStore = await cookies();
  cookieStore.delete("userId");
  cookieStore.delete("propertyId");

  return {
    success: true,
    message: "Email verified successfully.",
  };
}

export async function resendVerificationEmail(
  emailInput: string,
  nextInput?: string | null,
): Promise<ActionResult> {
  const email =
    typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";

  // The same answer whether or not the account exists, so this form cannot be
  // used to find out which emails are registered.
  const neutralResult: ActionResult = {
    success: true,
    message: NEUTRAL_MESSAGE,
  };

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return neutralResult;
  }

  // Per-IP limit (shared across server instances). This answer does not
  // reveal anything about any account, so it can be explicit.
  if (!(await allowResendAttempt())) {
    return {
      success: false,
      error: "Too many requests. Please wait a few minutes and try again.",
    };
  }

  // Only an invitation path in the exact expected format is ever accepted.
  const nextPath =
    typeof nextInput === "string" && invitePathRegex.test(nextInput)
      ? nextInput
      : null;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        emailVerifiedAt: true,
      },
    });

    if (!user || user.emailVerifiedAt) {
      return neutralResult;
    }

    // Database-backed cooldown per account: a new email is sent only if the
    // newest token is older than 60 seconds (or expired / already used).
    const activeToken = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    if (activeToken && Date.now() - activeToken.createdAt.getTime() < 60_000) {
      return neutralResult;
    }

    // Invited caretakers keep their invitation link after verifying.
    await sendVerificationEmail(
      user.id,
      user.email,
      user.role === "CARETAKER" ? nextPath : null,
    );

    return neutralResult;
  } catch (error) {
    console.error(
      "Resend verification email failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return neutralResult;
  }
}