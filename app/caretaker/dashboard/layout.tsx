import type { ReactNode } from "react";
import Link from "next/link";
import { Instrument_Sans, Instrument_Serif, Geist_Mono } from "next/font/google";
import LogoutButton from "@/app/Components/LogoutButton";
import styles from "./Caretaker.module.css";
import { BottomNav, ReportLink, SideNav } from "./CaretakerNav";
import { Icon, Logo } from "./parts";
import { getCaretakerData } from "./data";
import { CHECKLIST_ITEMS } from "@/lib/checklistItems";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-serif", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export default async function CaretakerLayout({ children }: { children: ReactNode }) {
  const { user, properties, requests } = await getCaretakerData();

  const propertyIds = properties.map((p) => p.id);
  // The checklist badge is only exact for one property, so with several it stays hidden.
  const checksLeft =
    properties.length === 1 ? Math.max(0, CHECKLIST_ITEMS.length - properties[0].checklistItems.length) : 0;
  const awaiting = requests.filter((r) => r.status === "PENDING_APPROVAL").length;
  const badges = { checklist: checksLeft, requests: awaiting };

  const initials =
    user.name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "C";

  return (
    <div className={`${styles.shell} ${sans.variable} ${serif.variable} ${mono.variable}`}>
      <aside className={styles.side} aria-label="Sidebar">
        <Link className={styles.brand} href="/caretaker/dashboard">
          <Logo />
          <span>
            BAYTAK CARE
            <small>Caretaker</small>
          </span>
        </Link>

        <SideNav badges={badges} propertyIds={propertyIds} />

        <ReportLink propertyIds={propertyIds} className={`${styles.btn} ${styles.sideReport}`}>
          <Icon name="plus" />
          Report an issue
        </ReportLink>

        <div className={styles.low}>
          <div className={styles.me}>
            <span className={styles.av}>{initials}</span>
            <div>
              <b>{user.name}</b>
              <span>Caretaker</span>
            </div>
          </div>
          <LogoutButton className={styles.logout}>
            <Icon name="logout" />
            Log out
          </LogoutButton>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.mtop}>
          <Link className={styles.brand} href="/caretaker/dashboard">
            <Logo />
            BAYTAK CARE
          </Link>
          <LogoutButton className={styles.mtopLogout}>
            <Icon name="logout" />
          </LogoutButton>
        </div>
        {children}
      </main>

      <BottomNav badges={badges} propertyIds={propertyIds} />
      <ReportLink propertyIds={propertyIds} className={styles.mfab}>
        <Icon name="plus" />
        Report
      </ReportLink>
    </div>
  );
}