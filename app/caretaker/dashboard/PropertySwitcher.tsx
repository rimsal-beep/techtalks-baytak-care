"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Caretaker.module.css";
import { Icon } from "./parts";

type Item = { id: string; address: string; city: string | null };

/** Only shown when the caretaker looks after more than one property. */
export default function PropertySwitcher({ properties, currentId }: { properties: Item[]; currentId: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const current = properties.find((p) => p.id === currentId) ?? properties[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.tools} ref={box}>
      <button
        type="button"
        className={styles.psel}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.pselTh}>
          <Icon name="home" />
        </span>
        <span>
          <b>{current.address}</b>
          <span>{current.city ?? "Your property"}</span>
        </span>
        <Icon name="chev" />
      </button>

      {open && (
        <div className={styles.pop}>
          <div className={`${styles.popHead} ${styles.mono}`}>Your properties</div>
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`${pathname}?property=${encodeURIComponent(p.id)}`}
              className={styles.opt}
              onClick={() => setOpen(false)}
            >
              <span className={styles.optTh}>
                <Icon name="home" />
              </span>
              <span>
                <b>{p.address}</b>
                <span>{p.city ?? ""}</span>
              </span>
              {p.id === current.id && (
                <span className={styles.optTick}>
                  <Icon name="check" />
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}