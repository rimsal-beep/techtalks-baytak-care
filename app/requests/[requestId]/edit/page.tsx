import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRequestAccess, unwrap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import EditRequestForm from "./EditRequestForm";
import style from "@/app/Style/DashboardStyle.module.css";
import styles from "../RequestDetail.module.css";

export default async function EditRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const a = unwrap(await requireRequestAccess(requestId, "OWNER"));
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: a.request.id, status: "PENDING_APPROVAL", property: { ownerId: a.user.id } },
    select: { id: true, title: true, description: true, requestType: true, estimatedCost: true, currency: true, estimateNote: true },
  });
  if (!request) notFound();
  return (
    <div className={style.dashboardShell}>
      <main className={style.mainContent}>
        <Link href={"/requests/" + request.id} className={styles.breadcrumb}>&larr; Back to request</Link>
        <h2>Edit request</h2>
        <EditRequestForm request={{
          id: request.id, title: request.title, description: request.description ?? "",
          requestType: request.requestType, estimatedCost: request.estimatedCost?.toString() ?? "",
          currency: request.currency, estimateNote: request.estimateNote ?? "",
        }} />
      </main>
    </div>
  );
}
