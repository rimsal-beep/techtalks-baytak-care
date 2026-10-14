"use server";

import { requireRequestAccess } from "@/lib/authz";
import type { MaintenanceRequestFields } from "@/lib/maintenanceRequestFields";

const fail = (error: string) => ({ success: false as const, error });

export async function editRequest(requestId: string, input: MaintenanceRequestFields) {
  const a = await requireRequestAccess(requestId, "OWNER");
  if (!a.ok) return fail(a.error);
  void input;
  return fail("Requests can no longer be edited.");
}

export async function cancelRequest(requestId: string) {
  const a = await requireRequestAccess(requestId, "OWNER");
  if (!a.ok) return fail(a.error);
  return fail("Requests can no longer be cancelled.");
}
