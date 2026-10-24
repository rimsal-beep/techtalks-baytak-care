"use server";

import { createHash } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/auth";
import { requireVerifiedUser } from "../../lib/session";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { sendVerificationEmail } from "../../lib/emailVerification";
import { validatePassword } from "../../lib/passwordPolicy";
import {
  allowSignupAttempt,
  domainCanReceiveMail,
  isPlausibleEmail,
  isPwnedPassword,
} from "../../lib/signupGuards";

// The browser NEVER chooses a role.
// - No valid invitation link  -> OWNER
// - Valid invitation for this exact email -> CARETAKER
// Anything else is rejected.
type SignupInput = {
  name: string;
  email: string;
  password: string;
  next?: string | null;
};

type SignupResult =
  | {
      success: true;
      data: {
        id: string;
        name: string;
        email: string;
        role: "OWNER" | "CARETAKER";
      };
    }
  | {
      success: false;
      error: string;
    };

const nameRegex = /^[\p{L}\p{M}]+(?:[\s'’-][\p{L}\p{M}]+)*$/u;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const invitePathRegex = /^\/invite\/[a-f0-9]{64}$/;
const INVALID_INVITATION = "INVALID_CARETAKER_INVITATION";

// Sending problems are logged on the server (with the real cause) and the user
// continues to the "Check your email" page, where Resend is always available.
async function sendVerificationQuietly(
  userId: string,
  email: string,
  nextPath: string | null,
) {
  try {
    await sendVerificationEmail(userId, email, nextPath);
  } catch (error) {
    console.error(
      "Failed to send verification email:",
      error instanceof Error ? error.message : "unknown error",
      error instanceof Error ? error.cause : undefined,
    );
  }
}

export async function signup(input: SignupInput): Promise<SignupResult> {
  const trimmedName = typeof input?.name === "string" ? input.name.trim() : "";
  const email =
    typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input?.password === "string" ? input.password : "";

  const nextPath =
    typeof input?.next === "string" && invitePathRegex.test(input.next)
      ? input.next
      : null;

  if (!trimmedName) {
    return { success: false, error: "Name is required." };
  }

  if (trimmedName.length > 100 || !nameRegex.test(trimmedName)) {
    return {
      success: false,
      error: "Name can only contain letters, spaces, hyphens, and apostrophes.",
    };
  }

  if (!email) {
    return { success: false, error: "Email is required." };
  }

  if (email.length > 254 || !emailRegex.test(email)) {
    return { success: false, error: "Enter a valid email." };
  }

  if (!isPlausibleEmail(email)) {
    return { success: false, error: "Enter a valid email." };
  }

  const passwordError = validatePassword(password, {
    name: trimmedName,
    email,
  });

  if (passwordError) {
    return { success: false, error: passwordError };
  }

  // Rate limit before any expensive work (DNS, network, hashing, database).
  if (!(await allowSignupAttempt())) {
    return {
      success: false,
      error: "Too many attempts. Please try again in a few minutes.",
    };
  }

  if (!(await domainCanReceiveMail(email))) {
    return {
      success: false,
      error: "That email domain can't receive mail. Check for typos.",
    };
  }

  if (await isPwnedPassword(password)) {
    return {
      success: false,
      error:
        "This password appeared in a known data breach. Please choose a different one.",
    };
  }

  let user;

  try {
    const passwordHash = await hashPassword(password);

    // One User table + unique email: any existing account (owner or caretaker)
    // blocks a new signup. The database constraint is the real guard against
    // simultaneous requests.
    user = await prisma.$transaction(async (tx) => {
      if (nextPath) {
        const rawToken = nextPath.split("/")[2];
        const tokenHash = createHash("sha256").update(rawToken).digest("hex");

        const invitations = await tx.$queryRaw<
          {
            email: string;
            status: string;
            expiresAt: Date;
            deletedAt: Date | null;
            caretakerId: string | null;
          }[]
        >`
          SELECT
            i."email",
            i."status"::text AS "status",
            i."expiresAt",
            p."deletedAt",
            p."caretakerId"
          FROM "Invitation" i
          JOIN "Property" p ON p."id" = i."propertyId"
          WHERE i."tokenHash" = ${tokenHash}
          FOR UPDATE OF i, p
        `;

        const invitation = invitations[0];

        if (
          !invitation ||
          invitation.status !== "PENDING" ||
          invitation.expiresAt <= new Date() ||
          invitation.email.trim().toLowerCase() !== email ||
          invitation.deletedAt !== null ||
          invitation.caretakerId !== null
        ) {
          throw new Error(INVALID_INVITATION);
        }
      }

      return tx.user.create({
        data: {
          name: trimmedName,
          email,
          passwordHash,
          role: nextPath ? "CARETAKER" : "OWNER",
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === INVALID_INVITATION) {
      return {
        success: false,
        error:
          "This invitation is invalid, expired, or does not match your email.",
      };
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      // The email exists. If that account was never verified, don't leave the
      // person at a dead end: send a fresh link to the SAME account. Its name
      // and password are not changed, so nobody can take over an account by
      // signing up with someone else's email.
      try {
        const existing = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            emailVerifiedAt: true,
          },
        });

        if (existing && !existing.emailVerifiedAt) {
          const recent = await prisma.emailVerificationToken.findFirst({
            where: {
              userId: existing.id,
              usedAt: null,
              expiresAt: { gt: new Date() },
              createdAt: { gt: new Date(Date.now() - 60_000) },
            },
            select: { id: true },
          });

          if (!recent) {
            await sendVerificationQuietly(
              existing.id,
              existing.email,
              existing.role === "CARETAKER" ? nextPath : null,
            );
          }

          return {
            success: true,
            data: {
              id: existing.id,
              name: existing.name,
              email: existing.email,
              role: existing.role,
            },
          };
        }
      } catch (lookupError) {
        console.error(
          "Duplicate-email lookup failed:",
          lookupError instanceof Error ? lookupError.message : "unknown error",
        );
      }

      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }

    // Log only the error code/name, never the input or the full error object.
    console.error("Failed to create user:", {
      code: (error as { code?: string })?.code,
      name: error instanceof Error ? error.name : "unknown",
    });

    return { success: false, error: "Failed to create account." };
  }

  await sendVerificationQuietly(user.id, user.email, nextPath);

  return {
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

type UpdateProfileResult =
  { success: true } | { success: false; error: string };

export async function updateProfile(
  name: string,
  phone: string,
): Promise<UpdateProfileResult> {
  const auth = await requireVerifiedUser();

  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  const user = auth.user;

  if (user.role !== "OWNER") {
    return {
      success: false,
      error: "Only owners can complete their profile.",
    };
  }

  const trimmedName = typeof name === "string" ? name.trim() : "";
  const trimmedPhone = typeof phone === "string" ? phone.trim() : "";

  if (!trimmedName) {
    return { success: false, error: "Name is required." };
  }

  if (trimmedName.length > 100 || !nameRegex.test(trimmedName)) {
    return {
      success: false,
      error: "Name can only contain letters, spaces, hyphens, and apostrophes.",
    };
  }

  if (!trimmedPhone) {
    return { success: false, error: "Phone number is required." };
  }

  const parsed =
    trimmedPhone.length <= 20
      ? parsePhoneNumberFromString(trimmedPhone)
      : undefined;

  if (!parsed || !parsed.isValid()) {
    return {
      success: false,
      error: "Please enter a valid international phone number.",
    };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: trimmedName,
        phone: parsed.number,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { success: false, error: "Failed to update profile." };
  }
}