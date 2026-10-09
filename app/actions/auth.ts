"use server";

import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/auth";
import { createSessionToken, getCurrentUser } from "../../lib/session";
import { cookies } from "next/headers";
import { parsePhoneNumberFromString } from "libphonenumber-js";

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

const nameRegex = /^[\p{L}\p{M}]+(?:[\s'’-][\p{L}\p{M}]+)*$/u;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(input: SignupInput): Promise<SignupResult> {
  // The browser can send anything, so check every type first
  const trimmedName =
    typeof input?.name === "string" ? input.name.trim() : "";
  const email =
    typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input?.password === "string" ? input.password : "";
  const role = input?.role;

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

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return {
      success: false,
      error: "An account with this email already exists.",
    };
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

    if (user.role === "CARETAKER") {
      // TODO (Task 1, F1): only link when the email is verified.
      // Today anyone who types an invited email gets the property.
      const invitations = await prisma.invitation.findMany({
        where: {
          email: user.email,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        select: { id: true, propertyId: true },
      });

      if (invitations.length > 0) {
        await prisma.$transaction([
          // only fill a property that has no caretaker yet
          ...invitations.map((invitation) =>
            prisma.property.updateMany({
              where: { id: invitation.propertyId, caretakerId: null },
              data: { caretakerId: user.id },
            })
          ),
          prisma.invitation.updateMany({
            where: {
              id: {
                in: invitations.map((invitation) => invitation.id),
              },
            },
            data: { status: "ACCEPTED" },
          }),
        ]);
      }
    }

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

    return { success: false, error: "Failed to create account." };
  }
}

type UpdateProfileResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

export async function updateProfile(
  name: string,
  phone: string
): Promise<UpdateProfileResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

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

  // Check the phone again on the server (the form check can be skipped)
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
        phone: parsed.number, // clean +countrycode form
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update profile:", error);

    return { success: false, error: "Failed to update profile." };
  }
}