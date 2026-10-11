import type { CSSProperties } from "react";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { safeUrl } from "@/lib/safeUrl";

import styles from "../../Caretaker.module.css";
import d from "../../RequestDetail.module.css";
import { Icon, type IconName } from "../../parts";
import { STATUS } from "../../status";
import { longDate, money, shortDate } from "../../format";
import PhotoGrid from "../../PhotoGrid";
import JobForm from "./JobForm";
import StartWorkButton from "./StartWorkButton";

const TYPES: Record<string, string> = {
  PLUMBING: "Plumbing",
  ELECTRICAL: "Electrical",
  HVAC: "Air conditioning",
  STRUCTURAL: "Structural",
  APPLIANCE: "Appliance",
  PAINTING: "Painting",
  CLEANING: "Cleaning",
  OTHER: "Other",
};

const rise = (i: number) => ({ "--i": i }) as CSSProperties;

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "CARETAKER") redirect("/");

  // Only requests of properties that belong to THIS caretaker can be opened.
    const found = await prisma.maintenanceRequest.findFirst({
    where: { id, property: { caretakerId: user.id } },
    select: {
      id: true,
      title: true,
      description: true,
      requestType: true,
      status: true,
      issuePhotoUrls: true,
      estimatedCost: true,
      estimateNote: true,
      currency: true,
      approvedAt: true,
      rejectedAt: true,
      rejectionReason: true,
      completedAt: true,
      actualCost: true,
      beforePhotoUrls: true,
      afterPhotoUrls: true,
      receiptUrl: true,
      createdAt: true,
      reportedBy: { select: { id: true, name: true } },
      property: {
        select: {
          id: true,
          address: true,
          owner: { select: { name: true } },
        },
      },
    },
  });

    if (!found) notFound();

  // Only safe links reach the page (saved uploads or https), never anything else.
  const r = {
    ...found,
    issuePhotoUrls: found.issuePhotoUrls.map(safeUrl).filter(Boolean),
    beforePhotoUrls: found.beforePhotoUrls.map(safeUrl).filter(Boolean),
    afterPhotoUrls: found.afterPhotoUrls.map(safeUrl).filter(Boolean),
    receiptUrl: found.receiptUrl ? safeUrl(found.receiptUrl) || null : null,
  };

  const owner = r.property.owner?.name?.split(/\s+/)[0] || "The owner";
  const st = STATUS[r.status] ?? {
    label: r.status,
    tone: "wait" as const,
  };
  const estimate = r.estimatedCost !== null ? Number(r.estimatedCost) : null;
  const actual = r.actualCost !== null ? Number(r.actualCost) : null;
  const cur = r.currency;

  const waiting =
    r.status === "PENDING_APPROVAL" || r.status === "REPORTED";
  const approved = r.status === "APPROVED";
  const inProgress = r.status === "IN_PROGRESS";
  const completed = r.status === "COMPLETED";
  const declined = r.status === "REJECTED";
  const cancelled = r.status === "CANCELLED";
  const byMe = r.reportedBy.id === user.id;

  const banner: {
    tone: string;
    icon: IconName;
    title: string;
    text: string;
    cta?: "start" | "complete";
  } = waiting
    ? {
        tone: d.nbWait,
        icon: "clock",
        title: `Waiting for ${owner}’s approval`,
        text: "Don’t start the repair yet. Once it’s approved, you can start work from this page.",
      }
    : approved
      ? {
          tone: d.nbOk,
          icon: "wrench",
          title: "Ready to start the work",
          text: `${owner} approved this${
            r.approvedAt ? ` on ${shortDate(r.approvedAt)}` : ""
          }. Start the work when you are ready.`,
          cta: "start",
        }
      : inProgress
        ? {
            tone: d.nbOk,
            icon: "wrench",
            title: "Work in progress",
            text: "The repair has started. When the work is finished, add the final cost, photos and receipt below.",
            cta: "complete",
          }
        : completed
          ? {
              tone: d.nbDone,
              icon: "check",
              title: `Job completed${
                r.completedAt ? ` on ${shortDate(r.completedAt)}` : ""
              }`,
              text: `${
                actual !== null ? `Final cost ${money(actual, cur)}. ` : ""
              }${owner} has the photos and receipt.`,
            }
          : cancelled ? {
              tone: d.nbNo,
              icon: "x",
              title: `${owner} cancelled this request`,
              text: "No work should be started. The request and its history have been kept.",
            } : {
              tone: d.nbNo,
              icon: "x",
              title: `${owner} declined this request`,
              text: r.rejectionReason
                ? `Reason: ${r.rejectionReason}`
                : "No work is needed. If the problem gets worse, report it again with new photos.",
            };

  const steps = [
    {
      label: "Reported",
      sub: longDate(r.createdAt),
      on: true,
    },
    {
      label: declined ? `Declined by ${owner}` : `Approved by ${owner}`,
      sub: declined
        ? r.rejectedAt
          ? shortDate(r.rejectedAt)
          : "—"
        : r.approvedAt
          ? shortDate(r.approvedAt)
          : "Pending",
      on: declined || approved || inProgress || completed,
    },
    {
      label: "In progress",
      sub: inProgress || completed ? "Work started" : "Not yet",
      on: inProgress || completed,
    },
    {
      label: "Completed",
      sub:
        completed && r.completedAt
          ? shortDate(r.completedAt)
          : declined
            ? "—"
            : "Not yet",
      on: completed,
    },
  ];

  return (
    <div className={d.rpage}>
      <nav
        className={`${d.crumbs} ${styles.rise}`}
        style={rise(0)}
        aria-label="Breadcrumb"
      >
        <Link href="/caretaker/dashboard/requests">
          <Icon name="arrowL" />
          Requests
        </Link>
        <span className={d.sl}>/</span>
        <span>{r.property.address}</span>
        <span className={d.sl}>/</span>
        <b>{r.title}</b>
      </nav>

      <header className={`${d.rhead} ${styles.rise}`} style={rise(1)}>
        <span className={styles.mono}>
          Maintenance request · #{r.id.slice(0, 8)}
        </span>

        <div className={d.rtitle}>
          <h1>{r.title}</h1>
          <span
            className={`${styles.pill} ${styles[st.tone]} ${d.pillLg}`}
          >
            {st.label}
          </span>
        </div>

        <div className={d.rmeta}>
          <span>
            <Icon name="pin" />
            {r.property.address}
          </span>

          <span>
            <Icon name="tag" />
            {TYPES[r.requestType] ?? r.requestType}
          </span>

          <span>
            <Icon name="cal" />
            Reported {longDate(r.createdAt)}
          </span>
        </div>
      </header>

      <section
        className={`${d.nb} ${banner.tone} ${styles.rise}`}
        style={rise(2)}
      >
        <span className={d.nbi}>
          <Icon name={banner.icon} />
        </span>

        <div>
          <b>{banner.title}</b>
          <p>{banner.text}</p>
        </div>

        {banner.cta === "start" && (
          <StartWorkButton requestId={r.id} />
        )}

        {banner.cta === "complete" && (
          <a href="#job" className={`${styles.btn} ${d.nbBtn}`}>
            Complete the job
            <Icon name="arrowD" />
          </a>
        )}
      </section>

      <div className={d.rgrid}>
        <div className={d.rmain}>
          <section
            className={`${d.rsec} ${styles.rise}`}
            style={rise(3)}
          >
            <div className={d.rsh}>
              <h2>What was reported</h2>
            </div>

            <p className={d.rdesc}>
              {r.description?.trim() || "No description was added."}
            </p>

            <dl className={d.igrid}>
              <div>
                <dt>
                  <Icon name="user" />
                  Reported by
                </dt>
                <dd>
                  {r.reportedBy.name}
                  {byMe && <span className={d.muted}> (you)</span>}
                </dd>
              </div>

              <div>
                <dt>
                  <Icon name="tag" />
                  Issue type
                </dt>
                <dd>{TYPES[r.requestType] ?? r.requestType}</dd>
              </div>

              <div>
                <dt>
                  <Icon name="pin" />
                  Property
                </dt>
                <dd>{r.property.address}</dd>
              </div>

              <div>
                <dt>
                  <Icon name="cal" />
                  Reported on
                </dt>
                <dd>{longDate(r.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section
            className={`${d.rsec} ${styles.rise}`}
            style={rise(4)}
          >
            <div className={d.rsh}>
              <h2>Request photos</h2>

              {r.issuePhotoUrls.length > 0 && (
                <span className={d.muted}>
                  {r.issuePhotoUrls.length} photo
                  {r.issuePhotoUrls.length === 1 ? "" : "s"} · tap to enlarge
                </span>
              )}
            </div>

            {r.issuePhotoUrls.length > 0 ? (
              <PhotoGrid urls={r.issuePhotoUrls} big />
            ) : (
              <div className={d.phempty}>
                <Icon name="image" />
                <b>No photos uploaded yet.</b>
                <span>
                  Photos added when the issue was reported will show here.
                </span>
              </div>
            )}
          </section>

          {inProgress && (
            <JobForm
              requestId={r.id}
              estimate={estimate}
              currency={cur}
              ownerFirst={owner}
            />
          )}

          {completed && (
            <section
              className={`${d.rsec} ${styles.rise}`}
              style={rise(5)}
            >
              <div className={d.rsh}>
                <h2>Completion</h2>

                <span className={`${styles.pill} ${styles.done}`}>
                  Completed{r.completedAt ? ` ${shortDate(r.completedAt)}` : ""}
                </span>
              </div>

              <div className={d.cgrid}>
                <div>
                  <span className={styles.mono}>Final cost</span>
                  <b>{actual !== null ? money(actual, cur) : "—"}</b>

                  {actual !== null && estimate !== null && (
                    <Diff diff={actual - estimate} cur={cur} />
                  )}
                </div>

                <div>
                  <span className={styles.mono}>Receipt</span>

                  {r.receiptUrl ? (
                    <a
                      className={d.rlink}
                      href={r.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon name="file" />
                      View receipt
                    </a>
                  ) : (
                    <span className={d.muted}>Not added</span>
                  )}
                </div>
              </div>

              <div className={d.ba2} style={{ marginTop: 22 }}>
                <div className={d.bacol}>
                  <div className={d.bah}>
                    <b>Before</b>
                    <span>{r.beforePhotoUrls.length}</span>
                  </div>

                  {r.beforePhotoUrls.length ? (
                    <PhotoGrid urls={r.beforePhotoUrls} />
                  ) : (
                    <p className={d.muted}>No before photos.</p>
                  )}
                </div>

                <div className={d.bacol}>
                  <div className={d.bah}>
                    <b>After</b>
                    <span>{r.afterPhotoUrls.length}</span>
                  </div>

                  {r.afterPhotoUrls.length ? (
                    <PhotoGrid urls={r.afterPhotoUrls} />
                  ) : (
                    <p className={d.muted}>No after photos.</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className={`${d.rside} ${styles.rise}`} style={rise(3)}>
          <section className={d.ccard}>
            <span className={styles.mono}>Estimated cost</span>

            <div className={d.cbig}>
              <b>{estimate !== null ? money(estimate, cur) : "—"}</b>
              <span>{cur}</span>
            </div>

            {approved || inProgress || completed ? (
              <div className={d.capp}>
                <Icon name="check" />
                Approved by {owner}
                {r.approvedAt ? ` · ${shortDate(r.approvedAt)}` : ""}
              </div>
            ) : waiting ? (
              <div className={`${d.capp} ${d.cappWait}`}>
                <Icon name="clock" />
                Waiting for approval
              </div>
            ) : (
              <div className={`${d.capp} ${d.cappNo}`}>
                <Icon name="x" />
                Not approved
              </div>
            )}

            <div className={d.cnote}>
              <span className={styles.mono}>Estimate note</span>
              <p>
                {r.estimateNote?.trim() ? (
                  r.estimateNote
                ) : (
                  <span className={d.muted}>
                    No note was added to this estimate.
                  </span>
                )}
              </p>
            </div>

            {completed && actual !== null && (
              <div className={d.crows}>
                <div>
                  <span>Estimated</span>
                  <b>{estimate !== null ? money(estimate, cur) : "—"}</b>
                </div>

                <div>
                  <span>Final cost</span>
                  <b>{money(actual, cur)}</b>
                </div>

                {estimate !== null && (
                  <div className={d.cdiff}>
                    <Diff diff={actual - estimate} cur={cur} />
                  </div>
                )}
              </div>
            )}
          </section>

          {!cancelled && <section className={d.pcard}>
            <span className={styles.mono}>Progress</span>

            <ol
              className={`${d.vsteps} ${declined ? d.vstepsNo : ""}`}
            >
              {steps.map((s, i) => {
                const cur2 =
                  !s.on &&
                  (i === 0 || steps[i - 1].on) &&
                  !declined;

                return (
                  <li
                    key={s.label}
                    className={`${s.on ? d.on : ""} ${cur2 ? d.cur : ""}`}
                  >
                    <span className={d.dot}>
                      {s.on && (
                        <Icon
                          name={declined && i === 1 ? "x" : "check"}
                        />
                      )}
                    </span>

                    <div>
                      <b>{s.label}</b>
                      <span>{s.sub}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>}
        </aside>
      </div>
    </div>
  );
}

function Diff({ diff, cur }: { diff: number; cur: string }) {
  if (Math.abs(diff) < 0.005)
    return (
      <span className={`${d.dchip} ${d.dok}`}>
        <Icon name="check" />
        Matches the estimate
      </span>
    );

  return diff > 0 ? (
    <span className={`${d.dchip} ${d.dwait}`}>
      {money(diff, cur)} over estimate
    </span>
  ) : (
    <span className={`${d.dchip} ${d.dok}`}>
      {money(-diff, cur)} under estimate
    </span>
  );
}