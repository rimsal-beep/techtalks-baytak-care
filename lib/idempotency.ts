const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates and normalizes a client-generated idempotency key.
 */
export function normalizeIdempotencyKey(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const key = value.trim();

  if (!UUID_PATTERN.test(key)) {
    return null;
  }

  return key.toLowerCase();
}

/**
 * Detects a Prisma unique-constraint violation (P2002).
 */
export function isUniqueConstraintError(
  error: unknown
): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error && error.code === "P2002";
}