import BrandMark from "@/app/Components/BrandMark";
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
      where: { caretakerId: user.id, deletedAt: null },
      select: { id: true },
    });
    redirect(assignedProperty ? "/requests/new" : "/caretaker/dashboard");
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
                    <div className={styles.brand}>
            <BrandMark size={28} />
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
