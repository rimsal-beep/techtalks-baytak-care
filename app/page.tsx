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
    include: {
      caretaker: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return <Dashboard properties={properties} />;
}