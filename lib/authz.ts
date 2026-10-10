import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * One place that answers: "who is this user, and may they touch this record?"
 *
 * Rules
 *  1. The browser can send ids, but an id is only a question. The database answers it.
 *  2. The relationship (owner / assigned caretaker) goes INSIDE the Prisma `where`,
 *     so a record that is not yours simply does not come back.
 *  3. Not yours = "Not found", never "Forbidden". Nobody can learn which ids exist.
 *  4. Hiding a button is not a control. Every action and page calls these helpers.
 *
 * In a server action:
 *    const a = await requireOwnerOfProperty(propertyId);
 *    if (!a.ok) return { success: false, error: a.error };
 *
 * In a page or route handler:
 *    const { user, property } = unwrap(await requireOwnerOfProperty(propertyId));
 */

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export type Role = SessionUser["role"];

export type Fail = { ok: false; kind: "login" | "not_found" | "wrong_role"; error: string };
const LOGIN: Fail = { ok: false, kind: "login", error: "Not logged in." };
const NOT_FOUND: Fail = { ok: false, kind: "not_found", error: "Not found." };
const WRONG_ROLE: Fail = { ok: false, kind: "wrong_role", error: "Not allowed." };

/**
 * An id from the browser must be a plain short string.
 * A replayed server-action request can send an object such as { not: "x" },
 * and Prisma would treat it as a filter. This blocks that.
 */
export function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

/** Turns a failed check into the right page behaviour. Use it in pages and route handlers. */
export function unwrap<T extends { ok: true }>(result: T | Fail): T {
  if (result.ok) return result;
  if (result.kind === "login") redirect("/login");
  notFound();
}

/** Who is logged in? Optionally only these roles. */
export async function requireUser(
  roles?: Role[],
): Promise<Fail | { ok: true; user: SessionUser }> {
  const user = await getCurrentUser();
  if (!user) return LOGIN;
  if (roles && !roles.includes(user.role)) return WRONG_ROLE;
  // TODO (Task 1, email verification): if (!user.emailVerifiedAt) return LOGIN;
  return { ok: true, user };
}

/** The `where` for "properties this user belongs to". Use it in every list query. */
export function propertyScope(user: SessionUser) {
  return user.role === "OWNER" ? { ownerId: user.id } : { caretakerId: user.id };
}

/** The `where` for "requests this user may see". Use it in every list query. */
export function requestScope(user: SessionUser) {
  return { property: propertyScope(user) };
}

type PropertyInfo = { id: string; address: string; ownerId: string; caretakerId: string | null };
const PROPERTY_SELECT = { id: true, address: true, ownerId: true, caretakerId: true } as const;

/** Owner or assigned caretaker of this property (read access). */
export async function requirePropertyMember(
  propertyId: unknown,
): Promise<Fail | { ok: true; user: SessionUser; property: PropertyInfo }> {
  const u = await requireUser();
  if (!u.ok) return u;
  if (!isId(propertyId)) return NOT_FOUND;
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...propertyScope(u.user) },
    select: PROPERTY_SELECT,
  });
  return property ? { ok: true, user: u.user, property } : NOT_FOUND;
}

/** Only the OWNER of this property. */
export async function requireOwnerOfProperty(
  propertyId: unknown,
): Promise<Fail | { ok: true; user: SessionUser; property: PropertyInfo }> {
  const u = await requireUser(["OWNER"]);
  if (!u.ok) return u;
  if (!isId(propertyId)) return NOT_FOUND;
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: u.user.id },
    select: PROPERTY_SELECT,
  });
  return property ? { ok: true, user: u.user, property } : NOT_FOUND;
}

/** Only the CARETAKER assigned to this property. */
export async function requireAssignedCaretaker(
  propertyId: unknown,
): Promise<Fail | { ok: true; user: SessionUser; property: PropertyInfo }> {
  const u = await requireUser(["CARETAKER"]);
  if (!u.ok) return u;
  if (!isId(propertyId)) return NOT_FOUND;
  const property = await prisma.property.findFirst({
    where: { id: propertyId, caretakerId: u.user.id },
    select: PROPERTY_SELECT,
  });
  return property ? { ok: true, user: u.user, property } : NOT_FOUND;
}

type RequestInfo = { id: string; status: string; propertyId: string; reportedById: string };

/**
 * A request that belongs to one of this user's properties.
 * Pass `as` to also demand a role: requireRequestAccess(id, "OWNER") for approve / reject,
 * requireRequestAccess(id, "CARETAKER") for start work / complete.
 * For extra fields, run your own query with the same where: { id, ...requestScope(user) }.
 */
export async function requireRequestAccess(
  requestId: unknown,
  as?: Role,
): Promise<Fail | { ok: true; user: SessionUser; request: RequestInfo }> {
  const u = await requireUser(as ? [as] : undefined);
  if (!u.ok) return u;
  if (!isId(requestId)) return NOT_FOUND;
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, ...requestScope(u.user) },
    select: { id: true, status: true, propertyId: true, reportedById: true },
  });
  return request ? { ok: true, user: u.user, request } : NOT_FOUND;
}
