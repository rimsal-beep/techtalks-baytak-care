import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const TOKEN_EXPIRY_HOURS = 24;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  // First name for the greeting. A missing name must never block the email.
  let firstName = "";

  try {
    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    firstName = owner?.name?.trim().split(/\s+/)[0] ?? "";
  } catch {
    firstName = "";
  }

  const url = verificationUrl.toString();
  const safeUrl = escapeHtml(url);
  const greetingText = firstName ? `Hi ${firstName},` : "Hi,";
  const greetingHtml = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";

  const text = [
    "Confirm your email",
    "",
    `${greetingText} tap the link below to confirm your email and finish creating your Baytak Care account.`,
    "",
    `Confirm my email: ${url}`,
    "",
    "This link works once and expires in 24 hours. If you didn't create an account, you can ignore this email.",
  ].join("\n");

  const font = "Arial,Helvetica,sans-serif";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F2EEE7;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Confirm your email to finish creating your Baytak Care account.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2EEE7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E4E1D9;border-radius:24px;">
            <tr>
              <td style="padding:36px 40px 0;font-family:${font};font-size:13px;font-weight:600;letter-spacing:0.32em;color:#14213D;">
                BAYTAK CARE
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px 0;font-family:${font};">
                <h1 style="margin:0 0 14px;font-size:34px;line-height:1.15;font-weight:600;letter-spacing:-0.02em;color:#14213D;">
                  Confirm your email
                </h1>
                <p style="margin:0 0 28px;font-size:17px;line-height:1.6;color:#5A6478;">
                  ${greetingHtml} tap the button below to confirm your email and finish creating your Baytak Care account.
                </p>
                <a href="${safeUrl}" style="display:inline-block;padding:16px 32px;border-radius:999px;background:#14213D;color:#FFFFFF;font-size:17px;font-weight:600;text-decoration:none;">
                  Confirm my email
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 0;">
                <div style="border-top:1px solid #E4E1D9;font-size:0;line-height:0;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px 36px;font-family:${font};font-size:14px;line-height:1.7;color:#8B93A3;">
                This link works once and expires in 24 hours. If you didn&#39;t create an account, you can ignore this email.
                <br /><br />
                Button not working? Paste this link into your browser:<br />
                <a href="${safeUrl}" style="color:#14213D;word-break:break-all;">${safeUrl}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendEmail({
    to: email,
    subject: "Confirm your email for Baytak Care",
    text,
    html,
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