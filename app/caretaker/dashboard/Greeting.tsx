"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./Caretaker.module.css";

/**
 * Greeting + today's date. They depend on the visitor's clock, so they are
 * filled in after the page loads (the first paint says "Welcome", which is
 * the same on the server and in the browser, so there is no hydration mismatch).
 */
export default function Greeting({
  firstName,
  title,
  subtitle,
}: {
  firstName?: string;
  title?: ReactNode;
  subtitle: string;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
  const id = setTimeout(() => setNow(new Date()), 0);
  return () => clearTimeout(id);
}, []);

  const hour = now?.getHours() ?? 12;
  const hello = !now ? "Welcome" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const date = now
    ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : " ";

  return (
    <div>
      <span className={styles.mono}>{date}</span>
      <h1>{title ?? `${hello}, ${firstName}`}</h1>
      <p>{subtitle}</p>
    </div>
  );
}