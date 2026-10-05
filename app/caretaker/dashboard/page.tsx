import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logout } from "@/app/actions/logout";
import Checklist from "./Checklist";
import style from "./CaretakerDashboard.module.css";

const STATUS_LABEL: Record<string, string> = {
  REPORTED: "Reported",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export default async function CaretakerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "CARETAKER") {
    redirect("/");
  }

  const properties = await prisma.property.findMany({
  where: {
    caretakerId: user.id,
  },
  select: {
    id: true,
    address: true,
    city: true,
    checklistItems: {
      where: { completed: true },
      select: { text: true },
    },
  },
});
  if (properties.length === 0) {
    return (
      <div className={style.page}>
        <header className={style.header}>
          <div className={style.brand}>
            <div className={style.logo}>B</div>
            <span>Baytak Care</span>
          </div>

          <form action={logout}>
            <button type="submit" className={style.logoutButton}>
              Log out
            </button>
          </form>
        </header>

        <main className={style.main}>
          <div className={style.emptyState}>
            <h1 className={style.title}>
              You haven't been assigned to a property yet
            </h1>

            <p className={style.muted}>
              Once an owner invites you, it'll appear here.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const propertyIds = properties.map((property) => property.id);

  const requests = await prisma.maintenanceRequest.findMany({
    where: {
      propertyId: {
        in: propertyIds,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    include: {
      property: {
        select: {
          address: true,
        },
      },
    },
  });

  return (
    <div className={style.page}>
      <header className={style.header}>
        <div className={style.brand}>
          <div className={style.logo}>B</div>
          <span>Baytak Care</span>
        </div>

        <form action={logout}>
          <button type="submit" className={style.logoutButton}>
            Log out
          </button>
        </form>
      </header>

      <main className={style.main}>
        <h1 className={style.title}>Your properties</h1>

        <div className={style.propertyGrid}>
          {properties.map((property) => (
            <div key={property.id} className={style.propertyCard}>
              <h3>{property.address}</h3>

             {property.city && (
  <p className={style.city}>{property.city}</p>
)}

<Checklist
  propertyId={property.id}
  initialCompletedItems={property.checklistItems.map((item) => item.text)}
/>

<Link
  href={`/requests/new?propertyId=${property.id}`}
  className={style.reportButton}
>
  Report an issue
</Link>
            </div>
          ))}
        </div>

        <div className={style.statsRow}>
          <div className={style.statCard}>
            <strong>{requests.length}</strong>
            <span>Total requests</span>
          </div>

          <div className={style.statCard}>
            <strong>
              {
                requests.filter(
                  (request) => request.status === "PENDING_APPROVAL"
                ).length
              }
            </strong>
            <span>Awaiting approval</span>
          </div>

          <div className={style.statCard}>
            <strong>
              {
                requests.filter(
                  (request) => request.status === "COMPLETED"
                ).length
              }
            </strong>
            <span>Completed</span>
          </div>
        </div>

        <h2 className={style.sectionTitle}>Your requests</h2>

        {requests.length === 0 ? (
          <p className={style.muted}>No requests submitted yet.</p>
        ) : (
          <div className={style.requestList}>
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`/requests/${request.id}`}
                className={style.requestRow}
              >
                <div className={style.requestContent}>
                  <p className={style.requestTitle}>
                    {request.title}
                  </p>

                  <p className={style.requestMeta}>
                    {properties.length > 1
                      ? request.property.address
                      : new Date(request.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}
                  </p>

                  {request.status === "REJECTED" && (
                    <p className={style.rejectionReason}>
                      <strong>Rejection reason: </strong>
                      {request.rejectionReason?.trim() || "No rejection reason recorded."}
                    </p>
                  )}
                </div>

                <span
                  className={`${style.statusPill} ${
                    style[`status_${request.status}`]
                  }`}
                >
                  {STATUS_LABEL[request.status] ?? request.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}