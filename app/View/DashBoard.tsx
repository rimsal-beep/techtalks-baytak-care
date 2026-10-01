import Link from "next/link";
import DashboardLayout from "../Components/DashBoardCom/DashBoardLayout";
import style from "../Style/DashboardStyle.module.css";

type DashboardProps = {
  totalProperties: number;
  needAttention: number;
  pendingApprovals: number;
  activeMaintenance: number;
  userName: string;
};

export function Dashboard({
  totalProperties,
  needAttention,
  pendingApprovals,
  activeMaintenance,
  userName,
}: DashboardProps) {
  return (
    <DashboardLayout activePage="dashboard" userName={userName}>
      <div className={style.dashboardIntro}>
        <h2>Good to see you</h2>
        <p>
          {totalProperties === 0
            ? "Add your first property to get started."
            : `Here's what's happening across your ${totalProperties} ${totalProperties === 1 ? "property" : "properties"}.`}
        </p>
      </div>

      <div className={style.summaryGrid}>
        <Link href="/properties" className={style.summaryCard}>
          <strong>{totalProperties}</strong>
          <span>Total properties</span>
        </Link>

        <Link href="/requests/pending-approvals/" className={style.summaryCard}>
          <strong>{needAttention}</strong>
          <span>Need attention</span>
        </Link>

        <Link href="/requests/pending-approvals/" className={style.summaryCard}>
          <strong>{pendingApprovals}</strong>
          <span>Pending approvals</span>
        </Link>

        <Link href="/properties" className={style.summaryCard}>
          <strong>{activeMaintenance}</strong>
          <span>Active maintenance</span>
        </Link>
      </div>

      <Link href="/properties" className={style.dashboardSection} style={{ display: "block", textDecoration: "none" }}>
        <h3>Needs your attention</h3>
        <p>
          {pendingApprovals > 0
            ? `You have ${pendingApprovals} cost estimate${pendingApprovals === 1 ? "" : "s"} waiting for your approval.`
            : "No requests currently need your attention."}
        </p>
      </Link>

      <section className={style.dashboardSection}>
        <h3>Upcoming monthly checks</h3>
        <p>No upcoming checks to display.</p>
      </section>
    </DashboardLayout>
  );
}

export default Dashboard;