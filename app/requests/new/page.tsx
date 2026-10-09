import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { propertyScope, isId } from "@/lib/authz";
import { redirect } from "next/navigation";
import NewRequestForm from "./NewRequestForm";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string | string[] }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { propertyId } = await searchParams;

  // Ignore anything that is not a plain id (arrays, empty, too long)
  const wanted = isId(propertyId) ? propertyId : undefined;

  // Always limited to the user's own properties (owner or assigned caretaker)
  const property = await prisma.property.findFirst({
    where: { ...propertyScope(user), ...(wanted ? { id: wanted } : {}) },
    select: {
      id: true,
      address: true,
      city: true,
    },
  });

  if (!property) {
    return <div>No assigned property found.</div>;
  }

  return <NewRequestForm property={property} />;
}