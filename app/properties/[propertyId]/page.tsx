import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
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

  const requests = await prisma.maintenanceRequest.findMany({
    where: {
      propertyId: property.id,
    },
    select: {
      status: true,
    },
  });

  const pendingApprovals = requests.filter(
    (request) => request.status === "PENDING_APPROVAL"
  ).length;

  const activeMaintenance = requests.filter(
    (request) => request.status === "IN_PROGRESS"
  ).length;

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
        <Link href={`/properties/${property.id}/caretaker`}>
          {property.caretaker?.name || "No caretaker yet"}
        </Link>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginTop: "24px",
        }}
      >
        <div
          style={{
            background: "#f8fafc",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid #e2e8f0",
          }}
        >
          <small style={{ color: "#64748b" }}>Pending approvals</small>
          <h3 style={{ margin: "8px 0 0", fontSize: "2rem" }}>
            {pendingApprovals}
          </h3>
        </div>

        <div
          style={{
            background: "#f8fafc",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid #e2e8f0",
          }}
        >
          <small style={{ color: "#64748b" }}>Active maintenance</small>
          <h3 style={{ margin: "8px 0 0", fontSize: "2rem" }}>
            {activeMaintenance}
          </h3>
        </div>
      </div>
    </main>
  );
}