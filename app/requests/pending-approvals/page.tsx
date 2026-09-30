import DashboardLayout from "@/app/Components/DashBoardCom/DashBoardLayout";
import style from "@/app/Style/DashboardStyle.module.css";
import detailStyle from "@/app/properties/[propertyId]/PropertyDetail.module.css";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PendingApprovalsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "CARETAKER") {
    redirect("/caretaker/dashboard");
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where: {
      status: "PENDING_APPROVAL",
      property: {
        ownerId: user.id,
      },
    },
    select: {
      id: true,
      title: true,
      estimatedCost: true,
      currency: true,
      createdAt: true,
      property: {
        select: {
          address: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <DashboardLayout activePage="requests" userName={user.name}>
      <div className={style.propertiesHeader}>
        <div>
          <small>REQUESTS</small>
          <h2>Pending approvals</h2>
        </div>
      </div>

      <section className={detailStyle.section}>
        {requests.length === 0 ? (
          <div className={style.emptyState}>
            <h3>No pending approvals</h3>
            <p>Cost estimates waiting for your approval will appear here.</p>
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
                  <p className={detailStyle.requestTitle}>{request.title}</p>
                  <p className={detailStyle.requestMeta}>
                    {request.property.address} ·{" "}
                    {new Date(request.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {request.estimatedCost
                      ? ` · Est. ${request.currency} ${request.estimatedCost}`
                      : ""}
                  </p>
                </div>

                <span
                  className={`${detailStyle.pill} ${detailStyle.pillWarning}`}
                >
                  Pending approval
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
