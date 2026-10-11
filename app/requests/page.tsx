import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "../Components/DashBoardCom/DashBoardLayout";
import style from "../Style/DashboardStyle.module.css";

const STATUS_LABEL: Record<string, string> = {
  REPORTED: "Reported",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default async function RequestsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "CARETAKER") {
    redirect("/caretaker/dashboard");
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where: {
      property: {
        ownerId: user.id,
      },
    },
    include: {
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
          <small>YOUR REQUESTS</small>
          <h2>Maintenance Requests</h2>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className={style.emptyState}>
          <h3>No maintenance requests yet</h3>
          <p>
            Requests from your properties will appear here.
          </p>
        </div>
      ) : (
        <div>
          {requests.map((request) => (
            <Link
              key={request.id}
              href={`/requests/${request.id}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "20px",
                padding: "20px 0",
                borderBottom: "1px solid #e5e5e5",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: "17px",
                  }}
                >
                  {request.title}
                </h3>

                <p
                  style={{
                    margin: "0 0 5px",
                    color: "#555",
                  }}
                >
                  {request.property.address}
                </p>

                <p
                  style={{
                    margin: 0,
                    color: "#777",
                    fontSize: "14px",
                  }}
                >
                  {new Date(request.createdAt).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </p>
              </div>

              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  background: "#f1eee8",
                  fontSize: "13px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {STATUS_LABEL[request.status] ?? request.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}