import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import style from "@/app/Style/DashboardStyle.module.css";
import detailStyle from "./RequestDetail.module.css";

const STATUS_LABEL: Record<string, string> = {
  REPORTED: "Reported",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { requestId } = await params;

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: {
      reportedBy: { select: { name: true } },
      property: { select: { id: true, address: true, ownerId: true, caretakerId: true } },
    },
  });

  if (!request) {
    notFound();
  }

  const isAuthorized =
    request.property.ownerId === user.id || request.property.caretakerId === user.id;

  if (!isAuthorized) {
    redirect("/");
  }

  return (
    <div className={style.dashboardShell}>
      <main className={style.mainContent}>
        <Link href={`/properties/${request.property.id}`} className={detailStyle.breadcrumb}>
          &larr; {request.property.address}
        </Link>

        <div className={detailStyle.headRow}>
          <h2>{request.title}</h2>
          <span className={detailStyle.statusPill}>
            {STATUS_LABEL[request.status] ?? request.status}
          </span>
        </div>

        <section className={detailStyle.section}>
          <h3 className={detailStyle.sectionTitle}>Details</h3>
          <div className={detailStyle.row}>
            <span className={detailStyle.label}>Reported by</span>
            <span>{request.reportedBy.name}</span>
          </div>
          <div className={detailStyle.row}>
            <span className={detailStyle.label}>Type</span>
            <span>{request.requestType}</span>
          </div>
          <div className={detailStyle.row}>
            <span className={detailStyle.label}>Description</span>
            <span>{request.description || "—"}</span>
          </div>
        </section>

        <section className={detailStyle.section}>
          <h3 className={detailStyle.sectionTitle}>Cost estimate</h3>
          <div className={detailStyle.row}>
            <span className={detailStyle.label}>Estimated cost</span>
            <span>
              {request.estimatedCost
                ? `${request.currency} ${request.estimatedCost}`
                : "Not provided"}
            </span>
          </div>
          <div className={detailStyle.row}>
            <span className={detailStyle.label}>Estimate note</span>
            <span>{request.estimateNote || "—"}</span>
          </div>
        </section>

        <section className={detailStyle.section}>
          <h3 className={detailStyle.sectionTitle}>Photos</h3>
          {request.issuePhotoUrls.length === 0 ? (
            <p className={detailStyle.muted}>No photos submitted.</p>
          ) : (
            <div className={detailStyle.photoGrid}>
              {request.issuePhotoUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={detailStyle.photoLink}>
                  Photo {i + 1}
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}