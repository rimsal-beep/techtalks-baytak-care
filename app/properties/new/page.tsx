import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import houseIcon from "../../Images/House.png";
import PropertyForm from "./PropertyForm";
import styles from "./PropertyForm.module.css";

export default async function NewPropertyPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "OWNER") {
    redirect("/");
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandIcon} aria-hidden="true">
              <Image
                src={houseIcon}
                alt=""
                className={styles.brandIconImage}
                priority
              />
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
