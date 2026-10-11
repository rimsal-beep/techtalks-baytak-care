import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardLayout from "../Components/DashBoardCom/DashBoardLayout";
import style from "../Style/DashboardStyle.module.css";
import styles from "./Properties.module.css";
import { Icon, PropertyArt } from "./PropertyUI";
import {
  CHECKLIST_ITEMS,
  checklistProgress,
  initialOf,
  propertyStatus,
  shortDate,
  summarizeRequests,
} from "./propertyHelpers";

const PILL_TONE = {
  good: styles.pillGood,
  warn: styles.pillWarn,
  info: styles.pillInfo,
  muted: "",
} as const;

export default async function PropertiesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "OWNER") {
    redirect("/caretaker/dashboard");
  }

  const checklistMonthDate = new Date();
  const checklistMonthKey = `${checklistMonthDate.getFullYear()}-${String(
    checklistMonthDate.getMonth() + 1
  ).padStart(2, "0")}`;

  const properties = await prisma.property.findMany({
    where: {
      ownerId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
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
          status: true,
        },
      },
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
        <div className={styles.grid}>
          {properties.map((property) => {
            const { awaiting, inProgress, open } = summarizeRequests(
              property.maintenanceRequests
            );
            const checklist = checklistProgress(property.checklistItems);
            const status = propertyStatus(
              Boolean(property.caretaker),
              awaiting,
              inProgress
            );
            const lastCheck = shortDate(checklist.last);

            return (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className={styles.card}
              >
                <div className={styles.image}>
                  <PropertyArt seed={property.id} />

                  <span className={`${styles.pill} ${PILL_TONE[status.tone]}`}>
                    {status.label}
                  </span>

                  <span className={styles.go}>
                    <Icon name="arrow" size={16} />
                  </span>

                  <div className={styles.peek}>
                    <span>
                      <Icon name="wrench" size={14} />
                      {open} open
                    </span>
                    <span>
                      <Icon name="list" size={14} />
                      {checklist.count}/{CHECKLIST_ITEMS.length} checklist
                    </span>
                  </div>
                </div>

                <div className={styles.body}>
                  <div>
                    <h3 className={styles.title}>{property.address}</h3>

                    {property.city && (
                      <p className={styles.loc}>
                        <Icon name="pin" size={13} />
                        {property.city}
                      </p>
                    )}
                  </div>

                  <div className={styles.facts}>
                    <div className={styles.fact}>
                      <span className={styles.label}>Caretaker</span>
                      <div className={styles.person}>
                        <span
                          className={
                            property.caretaker
                              ? styles.avatar
                              : `${styles.avatar} ${styles.avatarEmpty}`
                          }
                        >
                          {property.caretaker
                            ? initialOf(property.caretaker.name)
                            : "?"}
                        </span>
                        <span
                          className={
                            property.caretaker
                              ? styles.value
                              : `${styles.value} ${styles.warn}`
                          }
                        >
                          {property.caretaker?.name ?? "None yet"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.fact}>
                      <span className={styles.label}>Last check</span>
                      <span
                        className={
                          lastCheck
                            ? styles.value
                            : `${styles.value} ${styles.muted}`
                        }
                      >
                        {lastCheck ?? "Not yet"}
                      </span>
                    </div>

                    <div className={styles.fact}>
                      <span className={styles.label}>Open</span>
                      <span className={styles.value}>{open}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          <Link href="/properties/new" className={styles.add}>
            <div>
              <span className={styles.plus}>
                <Icon name="plus" size={20} />
              </span>
              <span className={styles.addTitle}>Add a property</span>
              <span className={styles.addSub}>
                Invite a caretaker to look after it
              </span>
            </div>
          </Link>
        </div>
      )}
    </DashboardLayout>
  );
}