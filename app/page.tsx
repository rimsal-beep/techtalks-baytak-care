import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Dashboard } from "./View/DashBoard";
import { checklistProgress, propertyStatus, summarizeRequests } from "./properties/propertyHelpers";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/welcome");
  }

  if (user.role === "CARETAKER") {
    redirect("/caretaker/dashboard");
  }

  const checklistMonthDate = new Date();
  const checklistMonthKey = `${checklistMonthDate.getFullYear()}-${String(checklistMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const properties = await prisma.property.findMany({
    where: {
      ownerId: user.id,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
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
      checklistItems: {
        where: {
          completed: true,
          monthKey: checklistMonthKey,
        },
        select: {
          text: true,
          completedAt: true,
        },
      },
      maintenanceRequests: {
        select: {
          id: true,
          title: true,
          status: true,
          estimatedCost: true,
          currency: true,
          issuePhotoUrls: true,
          createdAt: true,
        },
      },
    },
  });

  const allRequests = properties.flatMap((property) => property.maintenanceRequests);
  const { awaiting, inProgress } = summarizeRequests(allRequests);

  // requests waiting for the owner, newest first (the card shows the first three)
  const attention = properties
    .flatMap((property) =>
      property.maintenanceRequests
        .filter((request) => request.status === "PENDING_APPROVAL")
        .map((request) => ({
          id: request.id,
          title: request.title,
          propertyId: property.id,
          address: property.address,
          createdAt: request.createdAt,
          cost: request.estimatedCost
            ? `${request.currency} ${Number(request.estimatedCost).toLocaleString("en-US")}`
            : null,
          photo: request.issuePhotoUrls[0] ?? null,
        }))
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      title: item.title,
      propertyId: item.propertyId,
      address: item.address,
      cost: item.cost,
      photo: item.photo,
    }));

  const checks = properties.map((property) => {
    const checklist = checklistProgress(property.checklistItems);

    return {
      id: property.id,
      address: property.address,
      done: checklist.count,
      total: checklist.total,
    };
  });

  const cards = properties.slice(0, 3).map((property) => {
    const summary = summarizeRequests(property.maintenanceRequests);
    const status = propertyStatus(Boolean(property.caretaker), summary.awaiting, summary.inProgress);

    return {
      id: property.id,
      address: property.address,
      city: property.city,
      statusLabel: status.label,
      tone: status.tone,
    };
  });

  return (
    <Dashboard
      userName={user.name}
      firstName={user.name.trim().split(/\s+/)[0] || user.name}
      totalProperties={properties.length}
      unassigned={properties.filter((property) => !property.caretaker).length}
      awaiting={awaiting}
      inProgress={inProgress}
      attention={attention}
      checks={checks}
      properties={cards}
    />
  );
}
