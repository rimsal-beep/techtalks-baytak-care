import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ApprovalActions from "./ApprovalActions";
import CompletionForm from "./CompletionForm";
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
      reportedBy: {
        select: {
          name: true,
        },
      },
      property: {
        select: {
          id: true,
          address: true,
          ownerId: true,
          caretakerId: true,
        },
      },
    },
  });

  if (!request) {
    notFound();
  }

  const isAuthorized =
    request.property.ownerId === user.id ||
    request.property.caretakerId === user.id;

  if (!isAuthorized) {
    redirect("/");
  }

  return (
    <div className={style.dashboardShell}>
      <main className={style.mainContent}>
        <Link
          href={`/properties/${request.property.id}`}
          className={detailStyle.breadcrumb}
        >
          &larr; {request.property.address}
        </Link>

        <div className={detailStyle.headRow}>
          <h2>{request.title}</h2>

          <span className={detailStyle.statusPill}>
            {STATUS_LABEL[request.status] ?? request.status}
          </span>
        </div>

        {request.status === "PENDING_APPROVAL" &&
          request.property.ownerId === user.id && (
            <ApprovalActions requestId={request.id} />
          )}

        {request.status === "REJECTED" && (
          <section className={detailStyle.section}>
            <h3 className={detailStyle.sectionTitle}>Rejection reason</h3>
            <p className={detailStyle.rejectionReason}>
              {request.rejectionReason?.trim() || "No rejection reason recorded."}
            </p>
          </section>
        )}

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
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={detailStyle.photoLink}
                >
                  Photo {i + 1}
                </a>
              ))}
            </div>
          )}
        </section>

        {request.status === "COMPLETED" && (
          <section className={detailStyle.section}>
            <h3 className={detailStyle.sectionTitle}>Completed work</h3>

            <div className={detailStyle.row}>
              <span className={detailStyle.label}>Actual cost</span>
              <span className={detailStyle.actualCostValue}>
                {request.actualCost != null
                  ? `${request.currency} ${request.actualCost.toFixed(2)}`
                  : "Not provided"}
              </span>
            </div>

            <div className={detailStyle.comparisonGrid}>
              {[
                { label: "BEFORE", photos: request.beforePhotoUrls ?? [] },
                { label: "AFTER", photos: request.afterPhotoUrls ?? [] },
              ].map(({ label, photos }) => (
                <div key={label} className={detailStyle.galleryPanel}>
                  <h4 className={detailStyle.galleryTitle}>{label}</h4>

                  {photos.length === 0 ? (
                    <p className={detailStyle.muted}>
                      No {label.toLowerCase()} photos submitted.
                    </p>
                  ) : (
                    <div className={detailStyle.galleryGrid}>
                      {photos.map((url, index) => (
                        <a
                          key={`${url}-${index}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={detailStyle.galleryItem}
                          aria-label={`View ${label.toLowerCase()} photo ${index + 1} (opens in a new tab)`}
                        >
                          <img
                            src={url}
                            alt={`${label === "BEFORE" ? "Before" : "After"} work photo ${index + 1}`}
                            className={detailStyle.galleryImage}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {request.receiptUrl && (
              <a
                href={request.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={detailStyle.receiptLink}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <rect x="5" y="3" width="14" height="18" rx="2" />
                  <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
                View receipt
              </a>
            )}
          </section>
        )}

        {request.property.caretakerId === user.id &&
          request.status === "IN_PROGRESS" && (
            <CompletionForm requestId={request.id} />
          )}

      </main>
    </div>
  );
}
