import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./LegalPage.module.css";

type LegalPageProps = {
  title: string;
  updated: string;
  children: ReactNode;
};

export default function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <main className={styles.page}>
      <article className={styles.card}>
        <Link href="/welcome" className={styles.back}>
          &larr; Back to Baytak Care
        </Link>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Last updated: {updated}</p>
        <div className={styles.body}>{children}</div>
      </article>
    </main>
  );
}