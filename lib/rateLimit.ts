type RateLimitEntry = {
  count: number;
  firstAttempt: number;
  blockedUntil: number;
};

const attempts = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

export function checkRateLimit(key: string) {
  const now = Date.now();
  const existing = attempts.get(key);

  if (!existing) {
    attempts.set(key, {
      count: 1,
      firstAttempt: now,
      blockedUntil: 0,
    });

    return { allowed: true };
  }

  if (existing.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(
        (existing.blockedUntil - now) / 1000
      ),
    };
  }

  if (now - existing.firstAttempt > WINDOW_MS) {
    attempts.set(key, {
      count: 1,
      firstAttempt: now,
      blockedUntil: 0,
    });

    return { allowed: true };
  }

  existing.count += 1;

  if (existing.count > MAX_ATTEMPTS) {
    existing.blockedUntil = now + BLOCK_MS;

    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(BLOCK_MS / 1000),
    };
  }

  return { allowed: true };
}