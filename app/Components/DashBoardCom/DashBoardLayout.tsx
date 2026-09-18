import React from "react";
import Link from "next/link";
import style from "../../Style/DashboardStyle.module.css";
import image from "../../Images/House.png";

type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  return (
    <div className={style.Body}>
      <header className={style.header}>
        <img
          alt="Baytak Care logo"
          src={image.src}
          className={style.log}
        />
        <h1>Baytak Care</h1>
      </header>

      <div className={style.dashboardShell}>
        <aside className={style.sidebar}>
          <Link href="/" className={style.activeNav}>
            Dashboard
          </Link>

          <span className={style.navItem}>Properties</span>
          <span className={style.navItem}>Requests</span>
          <span className={style.navItem}>Activity</span>
          <span className={style.navItem}>Notifications</span>
          <span className={style.navItem}>Settings</span>
        </aside>

        <main className={style.mainContent}>
          <small>OWNER DASHBOARD</small>
          <h2>My Properties</h2>

          {children}
        </main>
      </div>
    </div>
  );
}