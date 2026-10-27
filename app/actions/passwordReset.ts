"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { createPasswordResetToken } from "@/lib/passwordReset";

type ActionState = {
  message: string;
  error: string;
};

const NEUTRAL_MESSAGE =
  "If an account exists with that email, instructions will be sent.";

export async function requestPasswordReset(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const rawEmail = formData.get("email");
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return {
      message: "",
      error: "Please enter a valid email address.",
    };
  }

  const rateLimit = checkRateLimit(`password-reset:${email}`);

  if (!rateLimit.allowed) {
    return { message: NEUTRAL_MESSAGE, error: "" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      await createPasswordResetToken(user.id, user.email);
    }
  } catch (error) {
    console.error("Password reset request failed:", error);
  }

  return { message: NEUTRAL_MESSAGE, error: "" };
}