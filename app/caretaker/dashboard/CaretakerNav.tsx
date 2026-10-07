"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./Caretaker.module.css";
import { Icon, type IconName } from "./parts";

const BASE = "/caretaker/dashboard";
const ITEMS: { href: string; label: string; short: string; icon: IconName; badge?: "checklist" | "requests" }[] = [
  { href: BASE, label: "Overview", short: "Home", icon: "home" },
  { href: `${BASE}/checklist`, label: "Checklist", short: "Checklist", icon: "list", badge: "checklist" },
  { href: `${BASE}/requests`, label: "Requests", short: "Requests", icon: "wrench", badge: "requests" },
];

type Badges = { checklist: number; requests: number };

/** Keeps ?property=<id> when moving between the three pages. */
function useWithProperty(propertyIds: string[]) {
  const wanted = useSearchParams().get("property");
  const id = wanted && propertyIds.includes(wanted) ? wanted : null;
  return (href: string) => (id ? `${href}?property=${encodeURIComponent(id)}` : href);
}

function isActive(pathname: string, href: string) {
  return href === BASE ? pathname === BASE : pathname.startsWith(href);
}

/** Lets the glow in the menu follow the mouse. */
function follow(e: React.MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export function SideNav({ badges, propertyIds }: { badges: Badges; propertyIds: string[] }) {
  const pathname = usePathname();
  const withProperty = useWithProperty(propertyIds);
  return (
    <nav className={styles.nav} aria-label="Main">
      {ITEMS.map((it) => {
        const n = it.badge ? badges[it.badge] : 0;
        return (
          <Link
            key={it.href}
            href={withProperty(it.href)}
            onMouseMove={follow}
            className={`${styles.navLink} ${isActive(pathname, it.href) ? styles.navOn : ""}`}
            aria-current={isActive(pathname, it.href) ? "page" : undefined}
          >
            <Icon name={it.icon} />
            {it.label}
            {n > 0 && <span className={styles.ct}>{n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ badges, propertyIds }: { badges: Badges; propertyIds: string[] }) {
  const pathname = usePathname();
  const withProperty = useWithProperty(propertyIds);
  return (
    <nav className={styles.bnav} aria-label="Main">
      {ITEMS.map((it) => {
        const n = it.badge ? badges[it.badge] : 0;
        return (
          <Link
            key={it.href}
            href={withProperty(it.href)}
            className={`${styles.bnavLink} ${isActive(pathname, it.href) ? styles.bnavOn : ""}`}
            aria-current={isActive(pathname, it.href) ? "page" : undefined}
          >
            <Icon name={it.icon} />
            {it.short}
            {n > 0 && <span className={styles.bnavDot} />}
          </Link>
        );
      })}
    </nav>
  );
}

/** "Report an issue" that always points at the property being viewed. */
export function ReportLink({
  propertyIds,
  className,
  children,
}: {
  propertyIds: string[];
  className: string;
  children: React.ReactNode;
}) {
  const wanted = useSearchParams().get("property");
  const id = wanted && propertyIds.includes(wanted) ? wanted : propertyIds[0];
  if (!id) return null;
  return (
    <Link href={`/requests/new?propertyId=${encodeURIComponent(id)}`} className={className}>
      {children}
    </Link>
  );
}
