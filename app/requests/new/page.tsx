import { getCurrentUser } from "../../../lib/session";
import { prisma } from "../../../lib/prisma";
import NewRequestForm from "./NewRequestForm";

export default async function NewRequestPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <div>Not logged in.</div>;
  }

  const property = await prisma.property.findFirst({
    where:
      user.role === "CARETAKER"
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