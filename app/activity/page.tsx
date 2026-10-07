import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardLayout from "../Components/DashBoardCom/DashBoardLayout";
import style from "../Style/DashboardStyle.module.css";

export default async function ActivityPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "CARETAKER") {
    redirect("/caretaker/dashboard");
  }

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      OR: [
        {
          maintenanceRequest: {
            property: {
              ownerId: user.id,
            },
          },
        },
        {
          property: {
            ownerId: user.id,
          },
        },
      ],
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
          property: {
            select: {
              address: true,
            },
          },
        },
      },
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
    <DashboardLayout activePage="activity" userName={user.name}>
      <div className={style.propertiesHeader}>
        <div>
          <small>YOUR ACTIVITY</small>
          <h2>Activity History</h2>
        </div>
      </div>

      {activityLogs.length === 0 ? (
        <div className={style.emptyState}>
          <h3>No activity history yet</h3>
          <p>
            Activity from your properties will appear here.
          </p>
        </div>
      ) : (
        <div>
          {activityLogs.map((log) => (
            <div
              key={log.id}
              style={{
                padding: "20px 0",
                borderBottom: "1px solid #e5e5e5",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontWeight: 600,
                  fontSize: "16px",
                }}
              >
                {log.action}
              </p>

              <p
                style={{
                  margin: "6px 0",
                  color: "#555",
                }}
              >
                {log.property?.address ??
                  log.maintenanceRequest?.property.address ??
                  "Property activity"}
              </p>

              <p
                style={{
                  margin: "4px 0",
                  color: "#777",
                  fontSize: "14px",
                }}
              >
                {log.maintenanceRequest?.title ??
                  (log.propertyId ? "Property checklist" : "Activity")} ·{" "}
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
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}