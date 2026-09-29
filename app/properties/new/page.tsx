import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PropertyForm from "./PropertyForm";
import styles from "./PropertyForm.module.css";

export default async function NewPropertyPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "OWNER") {
    const assignedProperty = await prisma.property.findFirst({
      where: { caretakerId: user.id },
      select: { id: true },
    });
    redirect(assignedProperty ? "/requests/new" : "/caretaker/dashboard");
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
                <path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" />
              </svg>
            </span>
            <span className={styles.brandName}>Baytak Care</span>
          </div>
          <h1 className={styles.title}>Add a property</h1>
          <p className={styles.description}>
            Add the property address now. You can add more properties afterward.
          </p>
        </header>

        <PropertyForm />
      </div>
    </main>
  );
}
