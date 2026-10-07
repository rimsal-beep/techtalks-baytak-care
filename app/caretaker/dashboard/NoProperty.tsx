import styles from "./Caretaker.module.css";
import { EmptyState } from "./parts";

export default function NoProperty() {
  return (
    <section className={`${styles.sec} ${styles.rise}`}>
      <EmptyState
        title="No property assigned yet"
        text="When an owner invites you to a property, it will show up here."
      />
    </section>
  );
}