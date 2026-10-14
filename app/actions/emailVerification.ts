
"use server";

import { prisma } from "@/lib/prisma";
import {
  verifyEmailToken,
  sendVerificationEmail,
} from "@/lib/emailVerification";
import { checkRateLimit } from "@/lib/rateLimit";
import { cookies } from "next/headers";

type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

const NEUTRAL_MESSAGE =
  "If an account needs verification, instructions will be sent.";

export async function verifyEmail(
  token: string
): Promise<ActionResult> {
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
  emailInput: string
): Promise<ActionResult> {
  const email =
    typeof emailInput === "string"
      ? emailInput.trim().toLowerCase()
      : "";

  // Use a neutral response even for invalid input.
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

  // Limit repeated requests from the same email in this server instance.
  const rateLimit = checkRateLimit(`verify-email:${email}`);

  if (!rateLimit.allowed) {
    return neutralResult;
  }

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
    // Database-backed cooldown: permit another email only after
    // the previous token has expired or been consumed.
    const activeToken = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    if (
      activeToken &&
      Date.now() - activeToken.createdAt.getTime() < 60_000
    ) {
      return neutralResult;
    }

    await sendVerificationEmail(user.id, user.email);
    return neutralResult;
  } catch (error) {
    console.error("Resend verification email failed:", error);
    return neutralResult;
  }
}
