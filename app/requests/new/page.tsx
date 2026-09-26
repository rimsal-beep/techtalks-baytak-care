import { getCurrentUser } from "../../../lib/session";
import { prisma } from "../../../lib/prisma";
import { redirect } from "next/navigation";
import NewRequestForm from "./NewRequestForm";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { propertyId } = await searchParams;

  const property = await prisma.property.findFirst({
    where: propertyId
      ? { id: propertyId, caretakerId: user.id }
      : user.role === "CARETAKER"
      ? { caretakerId: user.id }
      : { ownerId: user.id },
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