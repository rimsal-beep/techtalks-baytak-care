import styles from "../Caretaker.module.css";
import PageHead from "../PageHead";
import NoProperty from "../NoProperty";
import Checklist from "../Checklist";
import { rise } from "../parts";
import { getCaretakerData, pickProperty } from "../data";

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const { properties } = await getCaretakerData();
  const property = pickProperty(properties, (await searchParams).property);
  if (!property) return <NoProperty />;

  const ownerFirst = (property.owner?.name ?? "the owner").split(" ")[0];

  return (
    <>
      <PageHead
        title={
          <>
            Monthly <em className={styles.serif}>checklist</em>
          </>
        }
        subtitle="Tick each item as you check it in the property."
        properties={properties}
        currentId={property.id}
      />
      <section className={`${styles.secTight} ${styles.rise}`} style={rise(1)}>
        <Checklist
          // key makes React start fresh when you switch property
          key={property.id}
          propertyId={property.id}
          propertyName={property.address}
          ownerFirst={ownerFirst}
          initialDone={property.checklistItems.map((i) => ({
            text: i.text,
            at: i.completedAt ? i.completedAt.toISOString() : null,
          }))}
        />
      </section>
    </>
  );
}