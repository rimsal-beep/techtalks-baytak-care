
import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { sendEmail } from "./email";

const TOKEN_EXPIRY_HOURS = 24;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getAppBaseUrl(): string {
  const configuredUrl = process.env.APP_URL;

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_URL must be configured in production.");
    }

    return "http://localhost:3000";
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("APP_URL must be a valid absolute URL.");
  }

  if (
    parsedUrl.protocol !== "https:" &&
    !(process.env.NODE_ENV !== "production" && parsedUrl.protocol === "http:")
  ) {
    throw new Error("APP_URL must use HTTPS in production.");
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("APP_URL must not contain credentials.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    ["localhost", "127.0.0.1", "::1"].includes(
      parsedUrl.hostname.toLowerCase()
    )
  ) {
    throw new Error("APP_URL must not point to localhost in production.");
  }

  return parsedUrl.origin;
}

export async function sendVerificationEmail(
  userId: string,
  email: string,
  nextPath: string | null = null
): Promise<void> {
  // Validate the application URL before creating a verification token.
  const baseUrl = getAppBaseUrl();

  // Generate a secure, unpredictable token.
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  );

  // Invalidate previous tokens before creating a new one.
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({
      where: { userId },
    }),
    prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  const verificationUrl = new URL("/verify-email", baseUrl);

  verificationUrl.searchParams.set("token", token);

  if (nextPath && /^\/invite\/[a-f0-9]{64}$/.test(nextPath)) {
    verificationUrl.searchParams.set("next", nextPath);
  }

  await sendEmail({
    to: email,
    subject: "Verify your Baytak Care email",
    text: [
      "Hello,",
      "",
      "Please verify your email address for your Baytak Care account.",
      "",
      `Verify your email: ${verificationUrl.toString()}`,
      "",
      "This link expires in 24 hours.",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>Hello,</p>
      <p>Please verify your email address for your Baytak Care account.</p>
      <p>
        <a href="${verificationUrl.toString()}">
          Verify my email
        </a>
      </p>
      <p>This link expires in 24 hours.</p>
      <p>If you did not create this account, you can ignore this email.</p>
    `,
  });
}

export async function verifyEmailToken(
  token: string
): Promise<{ success: true } | { success: false; error: string }> {
  const invalidResult = {
    success: false as const,
    error: "This verification link is invalid or has expired.",
  };

  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    return invalidResult;
  }

  const tokenHash = hashToken(token);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const verificationToken =
        await tx.emailVerificationToken.findUnique({
          where: { tokenHash },
        });

      if (!verificationToken) {
        return false;
      }

      const user = await tx.user.findUnique({
        where: { id: verificationToken.userId },
        select: { emailVerifiedAt: true },
      });

      if (!user) {
        return false;
      }

      // Allow a retry if this token has already verified its owner.
      if (user.emailVerifiedAt) {
        return true;
      }

      if (
        verificationToken.usedAt ||
        verificationToken.expiresAt <= new Date()
      ) {
        return false;
      }

      // Claim the token only if it remains unused and unexpired.
      const claimed = await tx.emailVerificationToken.updateMany({
        where: {
          id: verificationToken.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      if (claimed.count !== 1) {
        const refreshedUser = await tx.user.findUnique({
          where: { id: verificationToken.userId },
          select: { emailVerifiedAt: true },
        });

        return Boolean(refreshedUser?.emailVerifiedAt);
      }

      await tx.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerifiedAt: new Date() },
      });

      return true;
    });

    if (!result) {
      return invalidResult;
    }

    return { success: true };
  } catch (error) {
    console.error("Email verification failed:", error);

    return {
      success: false,
      error: "Unable to verify your email right now. Please try again.",
    };
  }
}
