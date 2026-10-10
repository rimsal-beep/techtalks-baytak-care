
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import PropertyCaretakerInvite from "@/app/View/PropertyCaretakerInvite";
import RemoveCaretakerButton from "@/app/View/RemoveCaretakerButton";
import ResendInvitationButton from "@/app/View/ResendInvitationButton";

export default async function PropertyCaretakerPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

    if (user.role !== "OWNER") {
    redirect("/caretaker/dashboard");
  }

  const { propertyId } = await params;

  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      ownerId: user.id,
    },
    select: {
      id: true,
      address: true,
      city: true,
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
    where: { propertyId: property.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, title: true, status: true, createdAt: true },
  });

  const pendingInvitations = !property.caretaker
    ? await prisma.invitation.findMany({
        where: {
          propertyId: property.id,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          email: true,
          expiresAt: true,
          emailSentAt: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

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

      <p>
        Caretaker: {property.caretaker?.name || "No caretaker yet"}
      </p>

      {property.caretaker && (
        <RemoveCaretakerButton propertyId={property.id} />
      )}

      <hr style={{ margin: "24px 0" }} />

      <h2>Maintenance requests</h2>

      {requests.length === 0 ? (
        <p>No requests yet for this property.</p>
      ) : (
        requests.map((request) => (
          <div
            key={request.id}
            style={{
              padding: "12px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <strong>{request.title}</strong>
            <div style={{ fontSize: "13px", color: "#666" }}>
              {request.status} ·{" "}
              {new Date(request.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))
      )}

      <hr style={{ margin: "24px 0" }} />

      {!property.caretaker && (
        <>
          <PropertyCaretakerInvite propertyId={property.id} />

          {pendingInvitations.length > 0 && (
            <section style={{ marginTop: 32 }}>
              <h2>Pending invitations</h2>

              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  style={{
                    padding: "16px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <p>{invitation.email}</p>

                  <p>
                    Expires:{" "}
                    {invitation.expiresAt.toLocaleDateString()}
                  </p>

                  <p>
                    Email:{" "}
                    {invitation.emailSentAt
                      ? "Submitted"
                      : "Not confirmed"}
                  </p>

                  <ResendInvitationButton
                    propertyId={property.id}
                    email={invitation.email}
                  />
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
