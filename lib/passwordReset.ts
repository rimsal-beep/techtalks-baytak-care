import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const TOKEN_EXPIRY_MINUTES = 30;
const RESEND_COOLDOWN_MS = 60_000;

function getAppBaseUrl(): string {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("APP_URL is not configured.");
  }

  const url = new URL(appUrl);

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("APP_URL contains unsupported URL components.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("APP_URL must use HTTP or HTTPS.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    (url.protocol !== "https:" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1")
  ) {
    throw new Error("APP_URL must use HTTPS in production.");
  }

  return url.origin;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

export async function createPasswordResetToken(
  userId: string,
  email: string
): Promise<void> {
  const recentToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId,
      createdAt: {
        gt: new Date(Date.now() - RESEND_COOLDOWN_MS),
      },
    },
    select: { id: true },
  });

  if (recentToken) {
    return;
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000
  );

  const appUrl = getAppBaseUrl();
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  try {
    await sendEmail({
      to: email,
      subject: "Reset your Baytak Care password",
      text: [
        "We received a request to reset your Baytak Care password.",
        "",
        `Use this link within ${TOKEN_EXPIRY_MINUTES} minutes:`,
        resetUrl,
        "",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: `
        <p>We received a request to reset your Baytak Care password.</p>
        <p>
          <a href="${escapeHtml(resetUrl)}">Reset your password</a>
        </p>
        <p>This link expires in ${TOKEN_EXPIRY_MINUTES} minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });
  } catch (error) {
    await prisma.passwordResetToken.deleteMany({
      where: { tokenHash },
    });

    throw error;
  }
}