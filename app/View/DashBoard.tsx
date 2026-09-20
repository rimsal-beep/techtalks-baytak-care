import DashboardLayout from "../Components/DashBoardCom/DashBoardLayout";
import style from "../Style/DashboardStyle.module.css";

type DashboardProps = {
  totalProperties: number;
  needAttention: number;
  pendingApprovals: number;
  activeMaintenance: number;
};

export function Dashboard({
  totalProperties,
  needAttention,
  pendingApprovals,
  activeMaintenance,
}: DashboardProps) {
  return (
    <DashboardLayout>
      <div className={style.dashboardIntro}>
        <h2>Good to see you</h2>
        <p>Here&apos;s what&apos;s happening across your properties.</p>
      </div>

      <div className={style.summaryGrid}>
        <div className={style.summaryCard}>
          <strong>{totalProperties}</strong>
          <span>Total properties</span>
        </div>

        <div className={style.summaryCard}>
          <strong>{needAttention}</strong>
          <span>Need attention</span>
        </div>

        <div className={style.summaryCard}>
          <strong>{pendingApprovals}</strong>
          <span>Pending approvals</span>
        </div>

        <div className={style.summaryCard}>
          <strong>{activeMaintenance}</strong>
          <span>Active maintenance</span>
        </div>
      </div>

      <section className={style.dashboardSection}>
        <h3>Needs your attention</h3>
        <p>No requests currently need your attention.</p>
      </section>

      <section className={style.dashboardSection}>
        <h3>Upcoming monthly checks</h3>
        <p>No upcoming checks to display.</p>
      </section>
    </DashboardLayout>
  );
}

export default Dashboard;