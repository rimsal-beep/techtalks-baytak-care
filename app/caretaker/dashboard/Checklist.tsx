"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { completeChecklistItem } from "@/app/actions/maintenance";
import { CHECKLIST_ITEMS } from "@/lib/checklistItems";
import styles from "./Caretaker.module.css";
import { CHECKLIST_ICONS, Icon, Ring } from "./parts";

type Done = { text: string; at: string | null }; // `at` is an ISO date string

type Props = {
  propertyId: string;
  propertyName: string;
  ownerFirst: string;
  initialDone: Done[];
};

const tick = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

function when(iso: string | null) {
  if (!iso) return "Done";
  const d = new Date(iso);
  return `Done · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export default function Checklist({ propertyId, propertyName, ownerFirst, initialDone }: Props) {
  const router = useRouter();
  const [done, setDone] = useState<Done[]>(initialDone);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const total = CHECKLIST_ITEMS.length;
  const count = CHECKLIST_ITEMS.filter((t) => done.some((d) => d.text === t)).length;
  const full = count === total;

  async function handleCheck(text: string) {
    if (loading) return; // one tick at a time, so a double click does nothing
    setError("");
    setLoading(text);
    const result = await completeChecklistItem({ propertyId, text });
    if (result.success) {
      setDone((cur) => [...cur, { text, at: new Date().toISOString() }]);
      router.refresh(); // updates the badges in the sidebar
    } else {
      setError(result.error ?? "Could not save this check. Please try again.");
    }
    setLoading(null);
  }

  return (
    <div className={styles.cl}>
      <div className={styles.clTop}>
        <Ring done={count} total={total} />
        <div>
          <span className={styles.mono}>{propertyName}</span>
          <h3>{full ? "All done!" : `${count} of ${total} completed`}</h3>
          <p>{full ? "Every check is complete this month. 🎉" : `${total - count} left`}</p>
          <div className={`${styles.segs} ${full ? styles.segsFull : ""}`}>
            {CHECKLIST_ITEMS.map((t) => (
              <i key={t} className={done.some((d) => d.text === t) ? styles.segOn : ""} />
            ))}
          </div>
        </div>
      </div>

      <ul className={styles.items}>
        {CHECKLIST_ITEMS.map((text, i) => {
          const entry = done.find((d) => d.text === text);
          const isLoading = loading === text;
          return (
            <li key={text}>
              <button
                type="button"
                role="checkbox"
                aria-checked={!!entry}
                className={`${styles.item} ${entry ? styles.ticked : ""}`}
                disabled={!!entry || loading !== null}
                onClick={() => handleCheck(text)}
              >
                <span className={styles.cb}>{isLoading ? <span className={styles.spin} /> : tick}</span>
                <span className={styles.ci}>
                  <Icon name={CHECKLIST_ICONS[i] ?? "eye"} />
                </span>
                <span className={styles.lab}>
                  {text}
                  <small>{entry ? when(entry.at) : "Not checked yet"}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className={styles.err} role="alert">
          {error}
        </p>
      )}

      {full && (
        <div className={styles.clDone}>
          <h3>Checklist complete</h3>
          <p>Nice work. Found a problem? Report it so {ownerFirst} can approve the fix.</p>
          <Link
            href={`/requests/new?propertyId=${encodeURIComponent(propertyId)}`}
            className={styles.btn}
          >
            <Icon name="plus" />
            Report an issue
          </Link>
        </div>
      )}
    </div>
  );
}