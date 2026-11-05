"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/passwordPolicy";
import { isPwnedPassword } from "@/lib/signupGuards";

type ResetResult = {
  success: boolean;
  message: string;
  error: string;
};

const INVALID_LINK =
  "This reset link is invalid or expired. Please request a new one.";

function fail(error: string): ResetResult {
  return { success: false, message: "", error };
}

export async function resetPassword(
  _previousState: ResetResult,
  formData: FormData
): Promise<ResetResult> {
  const rawToken = formData.get("token");
  const rawPassword = formData.get("password");
  const rawConfirmPassword = formData.get("confirmPassword");

  if (typeof rawToken !== "string" || !/^[a-f0-9]{64}$/.test(rawToken)) {
    return fail(INVALID_LINK);
  }

  if (
    typeof rawPassword !== "string" ||
    typeof rawConfirmPassword !== "string"
  ) {
    return fail("Please fill in both password fields.");
  }

  if (rawPassword !== rawConfirmPassword) {
    return fail("The passwords do not match.");
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  try {
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: { select: { email: true, name: true } },
      },
    });

    if (
      !tokenRecord ||
      tokenRecord.usedAt ||
      tokenRecord.expiresAt <= new Date()
    ) {
      return fail(INVALID_LINK);
    }

    // Same password rules as signup.
    const policyError = validatePassword(rawPassword, {
      email: tokenRecord.user.email,
      name: tokenRecord.user.name,
    });

    if (policyError) {
      return fail(policyError);
    }

    if (await isPwnedPassword(rawPassword)) {
      return fail(
        "This password appeared in a known data breach. Please choose a different one."
      );
    }

    const newPasswordHash = await hashPassword(rawPassword);

    const claimed = await prisma.$transaction(async (tx) => {
      const claimedToken = await tx.passwordResetToken.updateMany({
        where: {
          id: tokenRecord.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      if (claimedToken.count !== 1) {
        return false;
      }

      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash: newPasswordHash },
      });

      await tx.passwordResetToken.deleteMany({
        where: {
          userId: tokenRecord.userId,
          id: { not: tokenRecord.id },
        },
      });

      return true;
    });

    if (!claimed) {
      return fail(INVALID_LINK);
    }

    // Do not leave an old login in this browser after a reset.
    const cookieStore = await cookies();
    cookieStore.delete("userId");
    cookieStore.delete("propertyId");

    return {
      success: true,
      message: "Your password has been reset. You can now log in.",
      error: "",
    };
  } catch (error) {
    console.error(
      "Password reset failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return fail("We couldn't reset your password. Please try again.");
  }
}