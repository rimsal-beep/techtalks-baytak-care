import "server-only";

import { createHash } from "node:crypto";
import { resolveMx } from "node:dns/promises";
import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Checks the password against Have I Been Pwned using k-anonymity:
 * only the first 5 characters of the SHA-1 hash leave the server.
 * Fails open (returns false) if the service is unreachable.
 */
export async function isPwnedPassword(password: string): Promise<boolean> {
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });

    if (!res.ok) return false;

    const text = await res.text();

    return text.split("\n").some((line) => {
      const [hash, count] = line.trim().split(":");
      return hash === suffix && Number(count) > 0; // padding rows have count 0
    });
  } catch {
    return false;
  }
}

/**
 * Rejects domains that cannot receive mail (typos like gmial.con).
 * Only a definite "no such domain / no records" answer rejects;
 * temporary DNS errors fail open.
 */
export async function domainCanReceiveMail(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;

  try {
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    return !(code === "ENOTFOUND" || code === "ENODATA");
  }
}

let signupLimiter: Ratelimit | null = null;

function getSignupLimiter(): Ratelimit | null {
  if (signupLimiter) return signupLimiter;

  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }

  signupLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "baytak:signup",
  });

  return signupLimiter;
}

async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** Returns true when the request is allowed. */
export async function allowSignupAttempt(): Promise<boolean> {
  const limiter = getSignupLimiter();

  if (!limiter) {
    // Missing config must be visible in production logs.
    if (process.env.NODE_ENV === "production") {
      console.error("Signup rate limiter is NOT configured (Upstash env vars missing).");
    }
    return true;
  }

  try {
    const { success } = await limiter.limit(`ip:${await getClientIp()}`);
    return success;
  } catch (error) {
    console.error("Rate limiter error:", error instanceof Error ? error.message : error);
    return true;
  }
}

/**
 * Rejects addresses that cannot exist at Gmail (6-30 chars, letters/digits/dots).
 * Other domains are not checked here; the verification email covers them.
 */
export function isPlausibleEmail(email: string): boolean {
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;

  if (domain === "gmail.com" || domain === "googlemail.com") {
    const base = local.split("+")[0]; // user+tag@gmail.com is valid
    return (
      base.length >= 6 &&
      base.length <= 30 &&
      /^[a-z0-9]+(\.[a-z0-9]+)*$/.test(base)
    );
  }

  return true;
}

let resendLimiter: Ratelimit | null = null;

function getResendLimiter(): Ratelimit | null {
  if (resendLimiter) return resendLimiter;

  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }

  resendLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "10 m"),
    prefix: "baytak:resend",
  });

  return resendLimiter;
}

/** Per-IP limit for "resend verification email". Returns true when allowed. */
export async function allowResendAttempt(): Promise<boolean> {
  const limiter = getResendLimiter();

  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      console.error("Resend rate limiter is NOT configured (Upstash env vars missing).");
    }
    return true;
  }

  try {
    const { success } = await limiter.limit(`ip:${await getClientIp()}`);
    return success;
  } catch (error) {
    console.error("Rate limiter error:", error instanceof Error ? error.message : error);
    return true;
  }
}