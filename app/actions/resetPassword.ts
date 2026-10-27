"use server";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

type ResetResult = {
  success: boolean;
  message: string;
  error: string;
};

export async function resetPassword(
  _previousState: ResetResult,
  formData: FormData
): Promise<ResetResult> {
  const rawToken = formData.get("token");
  const rawPassword = formData.get("password");
  const rawConfirmPassword = formData.get("confirmPassword");

  if (
    typeof rawToken !== "string" ||
    !/^[a-f0-9]{64}$/.test(rawToken)
  ) {
    return {
      success: false,
      message: "",
      error: "This reset link is invalid or expired. Please request a new one.",
    };
  }

  if (
    typeof rawPassword !== "string" ||
    rawPassword.length < 8 ||
    rawPassword.length > 128
  ) {
    return {
      success: false,
      message: "",
      error: "Your password must be between 8 and 128 characters.",
    };
  }

  if (
    typeof rawConfirmPassword !== "string" ||
    rawPassword !== rawConfirmPassword
  ) {
    return {
      success: false,
      message: "",
      error: "The passwords do not match.",
    };
  }

  const tokenHash = createHash("sha256")
    .update(rawToken)
    .digest("hex");

  try {
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (
      !tokenRecord ||
      tokenRecord.usedAt ||
      tokenRecord.expiresAt <= new Date()
    ) {
      return {
        success: false,
        message: "",
        error: "This reset link is invalid or expired. Please request a new one.",
      };
    }

    const newPasswordHash = await hashPassword(rawPassword);

    const result = await prisma.$transaction(async (tx) => {
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

    if (!result) {
      return {
        success: false,
        message: "",
        error: "This reset link is invalid or expired. Please request a new one.",
      };
    }

    return {
      success: true,
      message: "Your password has been reset. You can now log in.",
      error: "",
    };
  } catch (error) {
    console.error("Password reset failed:", error);

    return {
      success: false,
      message: "",
      error: "We couldn't reset your password. Please try again.",
    };
  }
}