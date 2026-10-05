import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "userId";
const SESSION_SECRET = process.env.SESSION_SECRET;

function signUserId(userId: string) {
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return createHmac("sha256", SESSION_SECRET)
    .update(userId)
    .digest("hex");
}

export function createSessionToken(userId: string) {
  return `${userId}.${signUserId(userId)}`;
}

function verifySessionToken(token: string) {
  const separatorIndex = token.lastIndexOf(".");

  if (separatorIndex === -1) return null;

  const userId = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  if (!userId || !signature) return null;

  const expectedSignature = signUserId(userId);

  if (signature.length !== expectedSignature.length) return null;

  const isValid = timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  return isValid ? userId : null;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const userId = verifySessionToken(token);

  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
  });
}