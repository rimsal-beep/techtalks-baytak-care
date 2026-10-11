
"use server";

import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/auth";
import {
  createSessionToken,
  requireVerifiedUser,
} from "../../lib/session";
import { cookies } from "next/headers";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { sendVerificationEmail } from "../../lib/emailVerification";

type SignupInput = {
  name: string;
  email: string;
  password: string;
  role: "OWNER" | "CARETAKER";
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

const nameRegex =
  /^[\p{L}\p{M}]+(?:[\s'’-][\p{L}\p{M}]+)*$/u;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(input: SignupInput): Promise<SignupResult> {
  const trimmedName =
    typeof input?.name === "string" ? input.name.trim() : "";
  const email =
    typeof input?.email === "string"
      ? input.email.trim().toLowerCase()
      : "";
  const password =
    typeof input?.password === "string" ? input.password : "";
  const role = input?.role;

  if (!trimmedName) {
    return { success: false, error: "Name is required." };
  }

  if (trimmedName.length > 100 || !nameRegex.test(trimmedName)) {
    return {
      success: false,
      error:
        "Name can only contain letters, spaces, hyphens, and apostrophes.",
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

  try {
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email,
        passwordHash,
        role,
      },
    });

    if (role === "OWNER") {
      try {
        await sendVerificationEmail(user.id, user.email);
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
    }

    // BAY-71: Caretakers must accept a valid invitation.
    // Preserve the existing caretaker signup/session behavior.
    const cookieStore = await cookies();

    cookieStore.set("userId", createSessionToken(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

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
  | { success: true }
  | { success: false; error: string };

export async function updateProfile(
  name: string,
  phone: string
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
      error:
        "Name can only contain letters, spaces, hyphens, and apostrophes.",
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
