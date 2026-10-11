import { notFound } from "next/navigation";
import { requireOwnerOfProperty, unwrap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import styles from "@/app/properties/new/PropertyForm.module.css";
import EditPropertyForm from "./EditPropertyForm";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const a = unwrap(await requireOwnerOfProperty(propertyId));
  const property = await prisma.property.findFirst({
    where: { id: a.property.id, ownerId: a.user.id, deletedAt: null },
    select: { id: true, address: true, city: true },
  });

  if (!property) notFound();

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandName}>Baytak Care</span>
          </div>
          <h1 className={styles.title}>Edit property</h1>
          <p className={styles.description}>Update the address and city.</p>
        </header>

        <EditPropertyForm property={property} />
      </div>
    </main>
  );
}
