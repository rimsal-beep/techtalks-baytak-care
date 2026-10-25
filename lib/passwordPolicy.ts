// Shared by the signup page (instant feedback) and the server action (the real check).
// Pure TypeScript: no server-only imports, so it is safe to import in client components.

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_BYTES = 72;

const COMMON_PASSWORDS = new Set([
  "123456",
  "1234567",
  "12345678",
  "123456789",
  "password",
  "password1",
  "password1!",
  "password123",
  "qwerty",
  "qwerty123",
  "abc123",
  "111111",
  "123123",
  "letmein",
  "welcome1",
  "admin123",
  "iloveyou",
]);

export function validatePassword(
  password: string,
  ctx: { name?: string; email?: string } = {},
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return "Password is too long (72 bytes maximum).";
  }

  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return "Password must include uppercase and lowercase letters, a number, and a symbol.";
  }

  const lower = password.toLowerCase();

  const emailLocal = ctx.email?.split("@")[0]?.toLowerCase() ?? "";
  if (emailLocal.length >= 4 && lower.includes(emailLocal)) {
    return "Password must not contain your email address.";
  }

  for (const part of (ctx.name ?? "").toLowerCase().split(/\s+/)) {
    if (part.length >= 4 && lower.includes(part)) {
      return "Password must not contain your name.";
    }
  }

  if (COMMON_PASSWORDS.has(lower)) {
    return "That password is too common. Please choose another.";
  }

  return null;
}