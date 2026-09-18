import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Dashboard } from "./View/DashBoard";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "CARETAKER") {
    redirect("/waiting");
  }

  const properties = await prisma.property.findMany({
    where: {
      ownerId: user.id,
    },
    select: {
      id: true,
    },
  });

  const propertyIds = properties.map((property) => property.id);

  const requests = await prisma.maintenanceRequest.findMany({
    where: {
      propertyId: {
        in: propertyIds,
      },
    },
    select: {
      status: true,
    },
  });

  const pendingApprovals = requests.filter(
    (request) => request.status === "PENDING"
  ).length;

  const activeMaintenance = requests.filter(
    (request) => request.status === "IN_PROGRESS"
  ).length;

  return (
    <Dashboard
      totalProperties={properties.length}
      needAttention={pendingApprovals}
      pendingApprovals={pendingApprovals}
      activeMaintenance={activeMaintenance}
    />
  );
}