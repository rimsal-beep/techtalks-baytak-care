
import type { Prisma } from "@/generated/prisma/client";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * Central authorization helpers for users and property records.
 *
 * Unverified owners cannot use protected resources.
 * Caretaker access remains unchanged.
 */

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;
export type Role = SessionUser["role"];

export type Fail = {
  ok: false;
  kind: "login" | "not_found" | "wrong_role";
  error: string;
};

const LOGIN: Fail = {
  ok: false,
  kind: "login",
  error: "Not logged in or email not verified.",
};
const NOT_FOUND: Fail = {
  ok: false,
  kind: "not_found",
  error: "Not found.",
};
const WRONG_ROLE: Fail = {
  ok: false,
  kind: "wrong_role",
  error: "Not allowed.",
};

export function isId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 64
  );
}

export function unwrap<T extends { ok: true }>(
  result: T | Fail
): T {
  if (result.ok) return result;
  if (result.kind === "login") redirect("/login");
  notFound();
}

/** Who is logged in? Optionally restrict roles. */
export async function requireUser(
  roles?: Role[]
): Promise<Fail | { ok: true; user: SessionUser }> {
  const user = await getCurrentUser();

  if (!user) return LOGIN;

  // Email verification is required for owners only.
  if (user.role === "OWNER" && !user.emailVerifiedAt) {
    return LOGIN;
  }

  if (roles && !roles.includes(user.role)) {
    return WRONG_ROLE;
  }

  return { ok: true, user };
}

export function propertyScope(user: SessionUser) {
  return user.role === "OWNER"
    ? { ownerId: user.id, deletedAt: null }
    : { caretakerId: user.id, deletedAt: null };
}

export function requestScope(user: SessionUser) {
  return { property: propertyScope(user) };
}

type PropertyInfo = {
  id: string;
  address: string;
  ownerId: string;
  caretakerId: string | null;
};

const PROPERTY_SELECT = {
  id: true,
  address: true,
  ownerId: true,
  caretakerId: true,
} as const;

/** Owner or assigned caretaker of this property (read access). */
export async function requirePropertyMember(
  propertyId: unknown
): Promise<
  Fail | { ok: true; user: SessionUser; property: PropertyInfo }
> {
  const u = await requireUser();

  if (!u.ok) return u;
  if (!isId(propertyId)) return NOT_FOUND;

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...propertyScope(u.user) },
    select: PROPERTY_SELECT,
  });

  return property
    ? { ok: true, user: u.user, property }
    : NOT_FOUND;
}

/** Only the verified owner of this property. */
export async function requireOwnerOfProperty(
  propertyId: unknown
): Promise<
  Fail | { ok: true; user: SessionUser; property: PropertyInfo }
> {
  const u = await requireUser(["OWNER"]);

  if (!u.ok) return u;
  if (!isId(propertyId)) return NOT_FOUND;

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: u.user.id, deletedAt: null },
    select: PROPERTY_SELECT,
  });

  return property
    ? { ok: true, user: u.user, property }
    : NOT_FOUND;
}

/** Only the assigned caretaker of this property. */
export async function requireAssignedCaretaker(
  propertyId: unknown
): Promise<
  Fail | { ok: true; user: SessionUser; property: PropertyInfo }
> {
  const u = await requireUser(["CARETAKER"]);

  if (!u.ok) return u;
  if (!isId(propertyId)) return NOT_FOUND;

  const property = await prisma.property.findFirst({
    where: { id: propertyId, caretakerId: u.user.id, deletedAt: null },
    select: PROPERTY_SELECT,
  });

  return property
    ? { ok: true, user: u.user, property }
    : NOT_FOUND;
}

type RequestInfo = {
  id: string;
  status: string;
  propertyId: string;
  reportedById: string;
};

/**
 * A request belonging to one of this user's properties.
 * Use `as` to require a particular role.
 */
export async function requireRequestAccess(
  requestId: unknown,
  as?: Role
): Promise<
  Fail | { ok: true; user: SessionUser; request: RequestInfo }
> {
  const u = await requireUser(as ? [as] : undefined);

  if (!u.ok) return u;
  if (!isId(requestId)) return NOT_FOUND;

  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, ...requestScope(u.user) },
    select: {
      id: true,
      status: true,
      propertyId: true,
      reportedById: true,
    },
  });

  return request
    ? { ok: true, user: u.user, request }
    : NOT_FOUND;
}

/** Serialize property-scoped writes with deletion; recheck membership under the lock. */
export async function lockActiveProperty(
  tx: Prisma.TransactionClient,
  propertyId: string,
  user: SessionUser
) {
  const rows = user.role === "OWNER"
    ? await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Property"
        WHERE "id" = ${propertyId} AND "ownerId" = ${user.id}
          AND "deletedAt" IS NULL FOR UPDATE`
    : await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Property"
        WHERE "id" = ${propertyId} AND "caretakerId" = ${user.id}
          AND "deletedAt" IS NULL FOR UPDATE`;
  if (rows.length !== 1) throw new Error("PROPERTY_UNAVAILABLE");
}
