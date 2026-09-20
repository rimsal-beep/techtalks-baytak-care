import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import PropertyCaretakerInvite from "@/app/View/PropertyCaretakerInvite";

export default async function PropertyCaretakerPage({
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
    select: { id: true },
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
      <PropertyCaretakerInvite propertyId={property.id} />
    </main>
  );
}