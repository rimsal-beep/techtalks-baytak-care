import { getCurrentUser } from "@/lib/session";
import { getPropertyId } from "./actions/property";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Dashboard } from "./View/DashBoard";
import PropertyCaretakerInvite from "./View/PropertyCaretakerInvite";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "CARETAKER") {
    redirect("/waiting");
  }

  const propertyId = await getPropertyId();

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
    (request) => request.status === "PENDING_APPROVAL"
  ).length;

  const activeMaintenance = requests.filter(
    (request) => request.status === "IN_PROGRESS"
  ).length;

  const totalProperties = properties.length;
  const needAttention = pendingApprovals + activeMaintenance;

  return (
    <>
      <Dashboard
        totalProperties={totalProperties}
        needAttention={needAttention}
        pendingApprovals={pendingApprovals}
        activeMaintenance={activeMaintenance}
      />

      {user.role === "OWNER" && propertyId ? (
        <PropertyCaretakerInvite propertyId={propertyId} />
      ) : user.role === "OWNER" ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#17324D]">
            Add a property first
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a property before inviting a caretaker.
          </p>
          <a
            href="../properties/new"
            className="mt-4 inline-block rounded-xl bg-[#17324D] px-5 py-3 text-sm font-semibold text-white"
          >
            Add property
          </a>
        </section>
      ) : null}
    </>
  );
}