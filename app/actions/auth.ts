"use server";

import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/auth";
import { requireVerifiedUser } from "../../lib/session";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { sendVerificationEmail } from "../../lib/emailVerification";
import { createHash } from "node:crypto";

type SignupInput = {
  name: string;
  email: string;
  password: string;
  role: "OWNER" | "CARETAKER";
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

export async function signup(input: SignupInput): Promise<SignupResult> {
  const trimmedName = typeof input?.name === "string" ? input.name.trim() : "";
  const email =
    typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input?.password === "string" ? input.password : "";
  const role = input?.role;

  const nextPath =
    typeof input?.next === "string" &&
    /^\/invite\/[a-f0-9]{64}$/.test(input.next)
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

  if (password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters.",
    };
  }

  if (password.length > 128) {
    return { success: false, error: "Password is too long." };
  }

  if (role !== "OWNER" && role !== "CARETAKER") {
    return { success: false, error: "Please choose a role." };
  }

  if (role === "CARETAKER" && !nextPath) {
    return {
      success: false,
      error: "A valid invitation link is required to register as a caretaker.",
    };
  }

  try {
    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      if (role === "CARETAKER") {
        const rawToken = nextPath!.split("/")[2];

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
          throw new Error("INVALID_CARETAKER_INVITATION");
        }
      }

      return tx.user.create({
        data: {
          name: trimmedName,
          email,
          passwordHash,
          role,
        },
      });
    });

    try {
      await sendVerificationEmail(
        user.id,
        user.email,
        role === "CARETAKER" ? nextPath : null,
      );
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);

      return {
        success: false,
        error:
          "Your account was created, but we couldn't send the verification email. Please try the resend option.",
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    console.error("Failed to create user:", error);

    if (
      error instanceof Error &&
      error.message === "INVALID_CARETAKER_INVITATION"
    ) {
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
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }

    return { success: false, error: "Failed to create account." };
  }
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
