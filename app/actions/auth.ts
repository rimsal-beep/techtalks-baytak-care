"use server";

import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/auth";
import { getCurrentUser } from "../../lib/session";
import { cookies } from "next/headers";

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

export async function signup(input: SignupInput): Promise<SignupResult> {
  const trimmedName = input.name?.trim();

  if (!trimmedName) {
    return {
      success: false,
      error: "Name is required.",
    };
  }

  if (!nameRegex.test(trimmedName)) {
    return {
      success: false,
      error: "Name can only contain letters, spaces, hyphens, and apostrophes.",
    };
  }

  if (!input.email?.trim()) {
    return {
      success: false,
      error: "Email is required.",
    };
  }

  if (!input.password || input.password.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters.",
    };
  }

  if (input.role !== "OWNER" && input.role !== "CARETAKER") {
    return {
      success: false,
      error: "Please choose a role.",
    };
  }

  const email = input.email.trim().toLowerCase();

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
    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email,
        passwordHash,
        role: input.role,
      },
    });

    const cookieStore = await cookies();

    cookieStore.set("userId", user.id, {
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

    return {
      success: false,
      error: "Failed to create account.",
    };
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
    return {
      success: false,
      error: "You must be logged in.",
    };
  }

  if (user.role !== "OWNER") {
    return {
      success: false,
      error: "Only owners can complete their profile.",
    };
  }

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();

  if (!trimmedName) {
    return {
      success: false,
      error: "Name is required.",
    };
  }

  if (!nameRegex.test(trimmedName)) {
    return {
      success: false,
      error: "Name can only contain letters, spaces, hyphens, and apostrophes.",
    };
  }

  if (!trimmedPhone) {
    return {
      success: false,
      error: "Phone number is required.",
    };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: trimmedName,
        phone: trimmedPhone,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to update profile:", error);

    return {
      success: false,
      error: "Failed to update profile.",
    };
  }
}