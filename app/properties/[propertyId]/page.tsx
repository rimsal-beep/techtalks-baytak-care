import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function PropertyDetailsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "CARETAKER") {
    redirect("/waiting");
  }

  const { propertyId } = await params;

  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      ownerId: user.id,
    },
    include: {
      caretaker: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!property) {
    notFound();
  }

  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "40px 24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>{property.address}</h1>

      {property.city && <p>{property.city}</p>}

      <hr />

      <h2>Caretaker</h2>

      <p>
        {property.caretaker?.name || "No caretaker yet"}
      </p>
    </main>
  );
}