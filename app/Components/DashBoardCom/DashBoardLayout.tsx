import React from "react";
import Link from "next/link";
import { logout } from "../../actions/logout";
import style from "../../Style/DashboardStyle.module.css";
import BrandMark from "../BrandMark";

type Props = {
  children: React.ReactNode;
  activePage?: "dashboard" | "properties" | "requests" | "activity";
  userName?: string;
};

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  properties: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17">
      <path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" />
    </svg>
  ),
  requests: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17">
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
};

export default function DashboardLayout({ children, activePage = "dashboard", userName }: Props) {
  return (
    <div className={style.Body}>
      <div className={style.dashboardShell}>
        <aside className={style.sidebar}>
          <div className={style.sidebarBrand}>
            <div className={style.sidebarLogo}><BrandMark /></div>
            <span>Baytak Care</span>
          </div>

          <nav className={style.sidebarNav}>
            <Link href="/" className={activePage === "dashboard" ? style.activeNav : style.navItem}>
              {icons.dashboard}
              Dashboard
            </Link>

            <Link href="/properties" className={activePage === "properties" ? style.activeNav : style.navItem}>
              {icons.properties}
              Properties
            </Link>


            <Link href="/requests" className={activePage === "requests" ? style.activeNav : style.navItem}>

              {icons.requests}
              Requests
            </Link>

            <Link href="/activity" className={activePage === "activity" ? style.activeNav : style.navItem}>
              {icons.activity}
              Activity
            </Link>
          </nav>

          <div className={style.sidebarFoot}>
            {userName && (
              <div className={style.sidebarUser}>
                <div className={style.sidebarAvatar}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className={style.sidebarUserName}>{userName}</span>
              </div>
            )}
            <form action={logout}>
              <button type="submit" className={style.logoutBtn}>
                {icons.logout}
                Log out
              </button>
            </form>
          </div>
        </aside>

        <main className={style.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}