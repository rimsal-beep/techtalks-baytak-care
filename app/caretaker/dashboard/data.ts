import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { safeUrl } from "@/lib/safeUrl";

/**
 * Everything the caretaker pages need, loaded once per request.
 * Every query is limited to properties where caretakerId = this user,
 * so a caretaker can never see another property, whatever is in the URL.
 */
export const getCaretakerData = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "CARETAKER") redirect("/");

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const properties = await prisma.property.findMany({
    where: { caretakerId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      address: true,
      city: true,
      owner: { select: { name: true } },
      checklistItems: {
        where: { completed: true, completedAt: { gte: startOfMonth } },
        select: { text: true, completedAt: true },
      },
    },
  });

  const requests = await prisma.maintenanceRequest.findMany({
    where: { reportedById: user.id, property: { caretakerId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      title: true,
      status: true,
      estimatedCost: true,
      currency: true,
      issuePhotoUrls: true,
      createdAt: true,
      rejectionReason: true,
      propertyId: true,
      property: { select: { address: true } },
    },
  });

   return {
    user: { name: user.name ?? "Caretaker" },
    properties,
    requests: requests.map((request) => ({
      ...request,
      issuePhotoUrls: request.issuePhotoUrls.map(safeUrl).filter(Boolean),
    })),
  };
});

export type CaretakerData = Awaited<ReturnType<typeof getCaretakerData>>;
export type CaretakerProperty = CaretakerData["properties"][number];
export type CaretakerRequest = CaretakerData["requests"][number];

/**
 * Picks the property from ?property=<id>. If the id is missing or is not one of
 * THIS caretaker's properties, it quietly falls back to the first one.
 */
export function pickProperty(properties: CaretakerProperty[], wanted?: string | string[]) {
  const id = Array.isArray(wanted) ? wanted[0] : wanted;
  return properties.find((p) => p.id === id) ?? properties[0] ?? null;
}

/** Month progress for one property: which items are done and when. */
export function monthProgress(property: CaretakerProperty, allItems: readonly string[]) {
  const doneAt = new Map<string, Date | null>();
  for (const item of property.checklistItems) doneAt.set(item.text, item.completedAt);
  const done = allItems.filter((t) => doneAt.has(t)).length;
  return { doneAt, done, total: allItems.length };
}