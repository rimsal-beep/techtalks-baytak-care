import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PropertyCaretakerInvite from "@/app/View/PropertyCaretakerInvite";
import style from "@/app/Style/DashboardStyle.module.css";
import detailStyle from "./PropertyDetail.module.css";

const STATUS_LABEL: Record<string, string> = {
  REPORTED: "Reported",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

const STATUS_CLASS: Record<string, string> = {
  REPORTED: detailStyle.pillNew,
  PENDING_APPROVAL: detailStyle.pillWarning,
  APPROVED: detailStyle.pillBrand,
  REJECTED: detailStyle.pillDanger,
  IN_PROGRESS: detailStyle.pillWarning,
  COMPLETED: detailStyle.pillSuccess,
};

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
    where: {
      propertyId: property.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      maintenanceRequest: {
        propertyId: property.id,
      },
    },
    include: {
      performedBy: {
        select: {
          name: true,
        },
      },
      maintenanceRequest: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const pendingApprovals = requests.filter(
    (request) => request.status === "PENDING_APPROVAL"
  ).length;

  const activeMaintenance = requests.filter(
    (request) => request.status === "IN_PROGRESS"
  ).length;

  return (
    <div className={style.dashboardShell}>
      <main className={style.mainContent}>
        <Link href="/properties" className={detailStyle.breadcrumb}>
          &larr; Properties
        </Link>

        <div className={style.propertiesHeader}>
          <div>
            <h2>{property.address}</h2>

            {property.city && (
              <p className={detailStyle.city}>{property.city}</p>
            )}
          </div>

          <div className={detailStyle.caretakerBadge}>
            <span className={style.caretakerLabel}>Caretaker</span>

            <p
              className={
                property.caretaker
                  ? style.caretakerName
                  : `${style.caretakerName} ${style.noCaretaker}`
              }
            >
              {property.caretaker?.name || "No caretaker yet"}
            </p>
          </div>
        </div>

        <div
          className={style.summaryGrid}
          style={{
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
          }}
        >
          <div className={style.summaryCard}>
            <strong>{pendingApprovals}</strong>
            <span>Pending approvals</span>
          </div>

          <div className={style.summaryCard}>
            <strong>{activeMaintenance}</strong>
            <span>Active maintenance</span>
          </div>
        </div>

        <section className={detailStyle.section}>
          <h3 className={detailStyle.sectionTitle}>
            Maintenance requests
          </h3>

          {requests.length === 0 ? (
            <div className={style.emptyState}>
              <h3>No requests yet</h3>
              <p>
                Once the caretaker reports an issue, it will show up here.
              </p>
            </div>
          ) : (
            <div className={detailStyle.requestList}>
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className={detailStyle.requestRow}
                >
                  <div>
                    <p className={detailStyle.requestTitle}>
                      {request.title}
                    </p>

                    <p className={detailStyle.requestMeta}>
                      {new Date(request.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}

                      {request.estimatedCost
                        ? ` · Est. $${request.estimatedCost}`
                        : ""}
                    </p>
                  </div>

                  <span
                    className={`${detailStyle.pill} ${
                      STATUS_CLASS[request.status] ?? detailStyle.pillNew
                    }`}
                  >
                    {STATUS_LABEL[request.status] ?? request.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className={detailStyle.section}>
          <h3 className={detailStyle.sectionTitle}>Activity History</h3>

          {activityLogs.length === 0 ? (
            <p className={detailStyle.muted}>
              No activity history yet.
            </p>
          ) : (
            <div className={detailStyle.activityTimeline}>
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className={detailStyle.activityItem}
                >
                  <div className={detailStyle.activityMarker}>
                    <span />
                  </div>

                  <div className={detailStyle.activityContent}>
                    <p className={detailStyle.activityAction}>
                      {log.action}
                    </p>

                    <p className={detailStyle.activityRequest}>
                      {log.maintenanceRequest?.title || "Activity"}
                    </p>

                    <p className={detailStyle.activityMeta}>
                      {log.performedBy.name} ·{" "}
                      {new Date(log.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={detailStyle.section}>
          <PropertyCaretakerInvite propertyId={property.id} />
        </section>
      </main>
    </div>
  );
}
