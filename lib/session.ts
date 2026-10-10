import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "userId";
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function signSession(userId: string, expiresAt: number) {
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters.");
  }

  return createHmac("sha256", SESSION_SECRET)
    .update(`${userId}.${expiresAt}`)
    .digest("hex");
}

export function createSessionToken(userId: string) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const signature = signSession(userId, expiresAt);

  return `${userId}.${expiresAt}.${signature}`;
}

function verifySessionToken(token: string) {
  const parts = token.split(".");

  if (parts.length !== 3) return null;

  const [userId, expiresAtString, signature] = parts;

  if (!userId || !expiresAtString || !signature) return null;

  const expiresAt = Number(expiresAtString);

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return null;
  }

  const expected = Buffer.from(signSession(userId, expiresAt));
  const given = Buffer.from(signature);

  // compare the BYTE length, otherwise timingSafeEqual throws
  if (given.length !== expected.length) return null;

  return timingSafeEqual(given, expected) ? userId : null;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const userId = verifySessionToken(token);

  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    omit: { passwordHash: true }, // never hand the hash to the rest of the app
  });
}