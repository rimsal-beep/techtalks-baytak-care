import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { propertyScope } from "@/lib/authz";

// The property now comes from the database, for the logged-in user.
// Before it came from a cookie that the browser could change.
async function getpropertyId() {
  const user = await getCurrentUser();
  if (!user) return "";

  const property = await prisma.property.findFirst({
    where: propertyScope(user),
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  return property?.id ?? "";
}

export { getpropertyId };