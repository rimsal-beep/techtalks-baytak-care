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
      emailSent: boolean;
    }
  | {
      success: false;
      error: string;
    };

const nameRegex = /^[\p{L}\p{M}]+(?:[\s'’-][\p{L}\p{M}]+)*$/u;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const invitePathRegex = /^\/invite\/[a-f0-9]{64}$/;
const INVALID_INVITATION = "INVALID_CARETAKER_INVITATION";

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

  // The account is valid at this point. If the email fails we keep the account,
  // tell the client honestly, and let the user use the resend option.
  let emailSent = true;

  try {
    await sendVerificationEmail(user.id, user.email, nextPath);
  } catch (emailError) {
    emailSent = false;
    console.error(
      "Failed to send verification email:",
      emailError instanceof Error ? emailError.message : "unknown error",
    );
  }

  return {
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    emailSent,
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