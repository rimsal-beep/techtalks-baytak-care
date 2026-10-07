import type { CSSProperties, ReactNode } from "react";
import styles from "./Caretaker.module.css";
import Greeting from "./Greeting";
import PropertySwitcher from "./PropertySwitcher";
import type { CaretakerProperty } from "./data";

export default function PageHead({
  title,
  firstName,
  subtitle,
  properties,
  currentId,
}: {
  title?: ReactNode;
  firstName?: string;
  subtitle: string;
  properties: CaretakerProperty[];
  currentId: string;
}) {
  return (
    <header className={`${styles.head} ${styles.rise}`} style={{ "--i": 0 } as CSSProperties}>
      <Greeting title={title} firstName={firstName} subtitle={subtitle} />
      {properties.length > 1 && (
        <PropertySwitcher
          properties={properties.map((p) => ({ id: p.id, address: p.address, city: p.city }))}
          currentId={currentId}
        />
      )}
    </header>
  );
}