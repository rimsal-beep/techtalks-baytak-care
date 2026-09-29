import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardLayout from "../Components/DashBoardCom/DashBoardLayout";
import style from "../Style/DashboardStyle.module.css";

type Property = {
  id: string;
  address: string;
  city: string | null;
  caretaker: {
    name: string;
  } | null;
};

export default async function PropertiesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "CARETAKER") {
    redirect("/caretaker/dashboard");
  }

  const properties: Property[] = await prisma.property.findMany({
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

  return (
    <DashboardLayout activePage="properties" userName={user.name}>
      <div className={style.propertiesHeader}>
        <div>
          <small>YOUR PROPERTIES</small>
          <h2>Properties</h2>
        </div>

        <Link href="/properties/new" className={style.addButton}>
          Add Property
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className={style.emptyState}>
          <h3>No properties yet</h3>
          <p>Add your first property to get started.</p>

          <Link href="/properties/new" className={style.addButton}>
            Add Property
          </Link>
        </div>
      ) : (
        <div className={style.propertyList}>
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className={style.propertyCard}
            >
              <h3>{property.address}</h3>

              {property.city && (
                <small className={style.propertyCity}>
                  {property.city}
                </small>
              )}

              <div className={style.caretaker}>
                <small className={style.caretakerLabel}>
                  Caretaker
                </small>

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
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
