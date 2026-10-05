                        /* eslint-disable @next/next/no-img-element -- photos come from uploads / pasted links, so plain <img> is fine */
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/app/Components/DashBoardCom/DashBoardLayout";
import PropertyCaretakerInvite from "@/app/View/PropertyCaretakerInvite";
import ApprovalActions from "@/app/requests/[requestId]/ApprovalActions";
import { Icon, PropertyArt } from "../PropertyUI";
import {
  CHECKLIST_ITEMS,
  checklistProgress,
  initialOf,
  propertyStatus,
  shortDate,
  summarizeRequests,
} from "../propertyHelpers";
import s from "./PropertyPage.module.css";

const STATUS_LABEL: Record<string, string> = {
  REPORTED: "Reported",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

const STATUS_CLASS: Record<string, string> = {
  REPORTED: s.chipNew,
  PENDING_APPROVAL: s.chipWarning,
  APPROVED: s.chipBrand,
  REJECTED: s.chipDanger,
  IN_PROGRESS: s.chipWarning,
  COMPLETED: s.chipSuccess,
};

const PILL_TONE = {
  good: s.pillGood,
  warn: s.pillWarn,
  info: s.pillInfo,
  muted: "",
} as const;

const TABS = ["overview", "requests", "photos", "checklist", "activity"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  overview: "Overview",
  requests: "Requests",
  photos: "Photos",
  checklist: "Checklist",
  activity: "Activity",
};

const STEPS = ["Submitted", "Approved", "In progress", "Completed"];

function stepIndex(status: string) {
  if (status === "COMPLETED") return 3;
  if (status === "IN_PROGRESS") return 2;
  if (status === "APPROVED" || status === "REJECTED") return 1;
  return 0;
}

const RESULT_TEXT: Record<string, string> = {
  REPORTED: "Waiting for a cost estimate",
  APPROVED: "Approved. Waiting for the caretaker to start.",
  IN_PROGRESS: "Work in progress",
  COMPLETED: "Completed",
  REJECTED: "Declined",
};

const niceType = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

const dateLabel = (date: Date) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** A grid of photo thumbnails; each one opens the full image in a new tab. */
function Photos({ urls, label }: { urls: string[]; label: string }) {
  return (
    <div className={s.photoGrid}>
      {urls.map((url, index) => (
        <a key={`${url}-${index}`} href={url} target="_blank" rel="noopener noreferrer" className={s.photo}>
          <img src={url} alt={`${label} photo ${index + 1}`} />
        </a>
      ))}
    </div>
  );
}

export default async function PropertyDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ tab?: string | string[]; request?: string | string[] }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "CARETAKER") {
    redirect("/caretaker/dashboard");
  }

  const { propertyId } = await params;
  const query = await searchParams;
  const rawTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const requestId = Array.isArray(query.request) ? query.request[0] : query.request;
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as Tab)
    : "overview";

  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      ownerId: user.id,
    },
    select: {
      id: true,
      address: true,
      city: true,
      caretaker: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      checklistItems: {
        where: {
          completed: true,
        },
        select: {
          text: true,
          completedAt: true,
        },
      },
    },
  });

  if (!property) {
    notFound();
  }

  const checklist = checklistProgress(property.checklistItems);

  const requests = await prisma.maintenanceRequest.findMany({
    where: {
      propertyId: property.id,
    },
    include: {
      reportedBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      maintenanceRequest: {
        propertyId: property.id,
      },
    },
    include: {
      performedBy: {
        select: {
          name: true,
        },
      },
      maintenanceRequest: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const { awaiting: pendingApprovals, inProgress } = summarizeRequests(requests);

  const activeMaintenance = requests.filter(
    (request) => request.status === "IN_PROGRESS"
  ).length;

  const status = propertyStatus(Boolean(property.caretaker), pendingApprovals, inProgress);
  const lastCheck = shortDate(checklist.last);
  const base = `/properties/${property.id}`;

  // the request shown in the side panel (only requests of this property can be opened)
  const selected =
    tab === "requests" && requestId ? requests.find((request) => request.id === requestId) : undefined;
  const selectedLogs = selected
    ? activityLogs.filter((log) => log.maintenanceRequestId === selected.id)
    : [];

  // requests that have any photo at all, for the Photos tab
  const photoRequests = requests.filter(
    (request) =>
      request.issuePhotoUrls.length + request.beforePhotoUrls.length + request.afterPhotoUrls.length > 0
  );
  const photoCount = photoRequests.reduce(
    (total, request) =>
      total + request.issuePhotoUrls.length + request.beforePhotoUrls.length + request.afterPhotoUrls.length,
    0
  );

  const tabBadge: Record<Tab, { text: string; warn?: boolean } | null> = {
    overview: null,
    requests: requests.length ? { text: String(requests.length), warn: pendingApprovals > 0 } : null,
    photos: photoCount ? { text: String(photoCount) } : null,
    checklist: { text: `${checklist.count}/${checklist.total}` },
    activity: null,
  };

  return (
    <DashboardLayout activePage="properties" userName={user.name}>
      {/* ---------- hero ---------- */}
      <section className={s.hero}>
        <div className={s.heroArt}>
          <PropertyArt seed={property.id} viewBox="0 160 800 240" />
        </div>
        <div className={s.heroShade} />

        <Link href="/properties" className={s.back}>
          <Icon name="arrow" size={14} />
          Properties
        </Link>

        <div className={s.heroInfo}>
          <div>
            <h1 className={s.heroTitle}>{property.address}</h1>

            <div className={s.heroMeta}>
              {property.city && (
                <span className={s.loc}>
                  <Icon name="pin" size={15} />
                  {property.city}
                </span>
              )}
              <span className={`${s.pill} ${PILL_TONE[status.tone]}`}>{status.label}</span>
            </div>
          </div>

          <div className={s.heroCaretaker}>
            <span className={property.caretaker ? s.avatar : `${s.avatar} ${s.avatarEmpty}`}>
              {property.caretaker ? initialOf(property.caretaker.name) : "?"}
            </span>
            <div>
              <span className={s.mono}>Caretaker</span>
              <b>{property.caretaker?.name || "No caretaker yet"}</b>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- tabs ---------- */}
      <nav className={s.tabs} aria-label="Property sections">
        {TABS.map((key) => {
          const badge = tabBadge[key];

          return (
            <Link
              key={key}
              href={`${base}?tab=${key}`}
              scroll={false}
              className={key === tab ? s.tabOn : s.tab}
              aria-current={key === tab ? "page" : undefined}
            >
              {TAB_LABEL[key]}
              {badge && (
                <span className={badge.warn ? `${s.badge} ${s.badgeWarn}` : s.badge}>
                  {badge.text}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ---------- overview ---------- */}
      {tab === "overview" && (
        <>
          <div className={s.facts}>
            <div className={s.fact}>
              <span className={s.mono}>Pending approvals</span>
              <span className={s.factValue}>{pendingApprovals}</span>
              <span className={s.factSub}>
                {pendingApprovals > 0 ? "Waiting for you" : "Nothing waiting"}
              </span>
            </div>

            <div className={s.fact}>
              <span className={s.mono}>Active maintenance</span>
              <span className={s.factValue}>{activeMaintenance}</span>
              <span className={s.factSub}>In progress now</span>
            </div>

            <div className={s.fact}>
              <span className={s.mono}>Checklist</span>
              <span className={s.factValue}>
                {checklist.count}/{checklist.total}
              </span>
              <span className={s.factSub}>Items completed</span>
            </div>

            <div className={s.fact}>
              <span className={s.mono}>Last check</span>
              <span className={s.factValue}>{lastCheck ?? "Not yet"}</span>
              <span className={s.factSub}>Latest checklist item</span>
            </div>
          </div>

          {pendingApprovals > 0 && (
            <Link href={`${base}?tab=requests`} className={s.attention}>
              <span>
                {pendingApprovals} cost estimate{pendingApprovals === 1 ? "" : "s"} waiting for
                your approval
              </span>
              <Icon name="arrow" size={16} />
            </Link>
          )}

          <div className={s.split}>
            <section className={s.card}>
              <div className={s.cardHead}>
                <h3 className={s.cardTitle}>Property checklist</h3>
                <span className={s.cardNote}>
                  {checklist.count} of {checklist.total} done
                </span>
              </div>

              <div className={checklist.count === checklist.total ? `${s.segs} ${s.segsDone}` : s.segs}>
                {CHECKLIST_ITEMS.map((text, index) => (
                  <i key={text} className={index < checklist.count ? `${s.seg} ${s.segOn}` : s.seg} />
                ))}
              </div>

              <p className={s.cardText}>
                {lastCheck
                  ? `Your caretaker last completed an item on ${lastCheck}.`
                  : "Your caretaker hasn't completed any checklist items yet."}
              </p>

              <Link href={`${base}?tab=checklist`} scroll={false} className={s.link}>
                View checklist
                <Icon name="arrow" size={14} />
              </Link>
            </section>

            <section className={s.card}>
              <div className={s.cardHead}>
                <h3 className={s.cardTitle}>Caretaker</h3>
              </div>

              <div className={s.who}>
                <span className={property.caretaker ? s.whoAvatar : `${s.whoAvatar} ${s.whoAvatarEmpty}`}>
                  {property.caretaker ? initialOf(property.caretaker.name) : "?"}
                </span>
                <div>
                  <span className={s.whoName}>{property.caretaker?.name || "No caretaker yet"}</span>
                  <span className={s.whoRole}>
                    {property.caretaker
                      ? "Looks after this property"
                      : "Invite someone you trust below"}
                  </span>
                </div>
              </div>

              {property.caretaker?.phone && (
                <a href={`tel:${property.caretaker.phone}`} className={s.contact}>
                  <Icon name="phone" size={16} />
                  {property.caretaker.phone}
                </a>
              )}

              {property.caretaker?.email && (
                <a href={`mailto:${property.caretaker.email}`} className={s.contact}>
                  <Icon name="mail" size={16} />
                  {property.caretaker.email}
                </a>
              )}
            </section>
          </div>

           {!property.caretaker && (
            <PropertyCaretakerInvite propertyId={property.id} />
          )}
        </>
      )}

      {/* ---------- requests ---------- */}
      {tab === "requests" &&
        (requests.length === 0 ? (
          <div className={s.empty}>
            <h3>No requests yet</h3>
            <p>Once the caretaker reports an issue, it will show up here.</p>
          </div>
        ) : (
          <div className={s.reqList}>
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`${base}?tab=requests&request=${request.id}`}
                scroll={false}
                className={request.id === selected?.id ? `${s.reqRow} ${s.reqRowOn}` : s.reqRow}
              >
                <span className={s.thumb}>
                  {request.issuePhotoUrls[0] ? (
                    <img src={request.issuePhotoUrls[0]} alt="" />
                  ) : (
                    <Icon name="wrench" size={20} />
                  )}
                </span>

                <span className={s.reqText}>
                  <span className={s.reqTitle}>{request.title}</span>
                  <span className={s.reqMeta}>
                    {dateLabel(request.createdAt)}
                    {request.estimatedCost ? ` · Est. $${request.estimatedCost}` : ""}
                  </span>
                </span>

                <span className={`${s.chip} ${STATUS_CLASS[request.status] ?? s.chipNew}`}>
                  {STATUS_LABEL[request.status] ?? request.status}
                </span>

                <span className={s.chev}>
                  <Icon name="arrow" size={16} />
                </span>
              </Link>
            ))}
          </div>
        ))}

      {/* ---------- photos ---------- */}
      {tab === "photos" &&
        (photoRequests.length === 0 ? (
          <div className={s.empty}>
            <h3>No photos yet</h3>
            <p>Photos from reported issues and finished work will appear here, before and after.</p>
          </div>
        ) : (
          <div className={s.photoStack}>
            {photoRequests.map((request) => (
              <section key={request.id} className={s.card}>
                <div className={s.cardHead}>
                  <div>
                    <h3 className={s.cardTitle}>{request.title}</h3>
                    <span className={s.cardNote}>{dateLabel(request.createdAt)}</span>
                  </div>

                  <Link
                    href={`${base}?tab=requests&request=${request.id}`}
                    scroll={false}
                    className={s.link}
                  >
                    View request
                    <Icon name="arrow" size={14} />
                  </Link>
                </div>

                {request.issuePhotoUrls.length > 0 && (
                  <div className={s.photoBlock}>
                    <span className={s.photoLabel}>Reported</span>
                    <Photos urls={request.issuePhotoUrls} label="Reported" />
                  </div>
                )}

                {(request.beforePhotoUrls.length > 0 || request.afterPhotoUrls.length > 0) && (
                  <div className={s.beforeAfter}>
                    <div className={s.photoBlock}>
                      <span className={s.photoLabel}>Before</span>
                      {request.beforePhotoUrls.length > 0 ? (
                        <Photos urls={request.beforePhotoUrls} label="Before" />
                      ) : (
                        <p className={s.muted}>No before photos</p>
                      )}
                    </div>

                    <div className={s.photoBlock}>
                      <span className={s.photoLabel}>After</span>
                      {request.afterPhotoUrls.length > 0 ? (
                        <Photos urls={request.afterPhotoUrls} label="After" />
                      ) : (
                        <p className={s.muted}>No after photos</p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        ))}

      {/* ---------- checklist ---------- */}
      {tab === "checklist" && (
        <section className={s.card}>
          <div className={s.cardHead}>
            <h3 className={s.cardTitle}>Property checklist</h3>
            <span className={s.cardNote}>
              {checklist.count} of {checklist.total} completed
            </span>
          </div>

          <div className={checklist.count === checklist.total ? `${s.segs} ${s.segsDone}` : s.segs}>
            {CHECKLIST_ITEMS.map((text, index) => (
              <i key={text} className={index < checklist.count ? `${s.seg} ${s.segOn}` : s.seg} />
            ))}
          </div>

          <div className={s.checkList}>
            {CHECKLIST_ITEMS.map((text) => {
              const completed = checklist.doneAt.has(text);
              const when = shortDate(checklist.doneAt.get(text) ?? null);

              return (
                <div key={text} className={s.checkItem}>
                  <span className={completed ? `${s.tick} ${s.tickOn}` : s.tick}>
                    <Icon name="check" size={13} />
                  </span>

                  <span className={s.checkText}>{text}</span>

                  <span className={completed ? `${s.checkStatus} ${s.checkStatusOn}` : s.checkStatus}>
                    {completed ? (when ? `Completed · ${when}` : "Completed") : "Not completed"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- activity ---------- */}
      {tab === "activity" &&
        (activityLogs.length === 0 ? (
          <div className={s.empty}>
            <h3>No activity yet</h3>
            <p>Approvals and completed work for this property will appear here.</p>
          </div>
        ) : (
          <section className={s.card}>
            <div className={s.timeline}>
              {activityLogs.map((log) => (
                <div key={log.id} className={s.logItem}>
                  <div className={s.marker}>
                    <span />
                  </div>

                  <div className={s.logBody}>
                    <p className={s.logAction}>{log.action}</p>

                    <p className={s.logRequest}>{log.maintenanceRequest?.title || "Activity"}</p>

                    <p className={s.logMeta}>
                      {log.performedBy.name} ·{" "}
                      {new Date(log.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

      {/* ---------- request side panel ---------- */}
      {selected && (
        <>
          <Link
            href={`${base}?tab=requests`}
            scroll={false}
            className={s.scrim}
            aria-label="Close request details"
          />

          <aside className={s.panel} role="dialog" aria-modal="true" aria-labelledby="request-panel-title">
            <Link href={`${base}?tab=requests`} scroll={false} className={s.panelClose} aria-label="Close">
              <Icon name="close" size={16} />
            </Link>

            <div className={s.panelScroll}>
              {selected.issuePhotoUrls.length > 0 && (
                <div className={s.strip}>
                  {selected.issuePhotoUrls.map((url, index) => (
                    <a
                      key={`${url}-${index}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.stripItem}
                    >
                      <img src={url} alt={`Reported photo ${index + 1}`} />
                    </a>
                  ))}
                </div>
              )}

              <div className={s.panelBody}>
                <div className={s.panelTop}>
                  <span className={s.panelKind}>Request</span>
                  <span className={`${s.chip} ${STATUS_CLASS[selected.status] ?? s.chipNew}`}>
                    {STATUS_LABEL[selected.status] ?? selected.status}
                  </span>
                </div>

                <h3 id="request-panel-title" className={s.panelTitle}>
                  {selected.title}
                </h3>
                <p className={s.panelSub}>
                  Reported {dateLabel(selected.createdAt)} by {selected.reportedBy.name}
                </p>

                {selected.description && <blockquote className={s.quote}>{selected.description}</blockquote>}

                <dl className={s.details}>
                  <div>
                    <dt>Type</dt>
                    <dd>{niceType(selected.requestType)}</dd>
                  </div>

                  <div>
                    <dt>Estimated cost</dt>
                    <dd>
                      {selected.estimatedCost
                        ? `${selected.currency} ${selected.estimatedCost}`
                        : "Not provided"}
                    </dd>
                  </div>

                  {selected.estimateNote && (
                    <div>
                      <dt>Estimate note</dt>
                      <dd>{selected.estimateNote}</dd>
                    </div>
                  )}

                  {selected.status === "COMPLETED" && (
                    <div>
                      <dt>Actual cost</dt>
                      <dd>
                        {selected.actualCost != null
                          ? `${selected.currency} ${Number(selected.actualCost).toFixed(2)}`
                          : "Not provided"}
                      </dd>
                    </div>
                  )}
                </dl>

                <ol className={s.steps}>
                  {STEPS.map((label, index) => {
                    const current = stepIndex(selected.status);
                    const declined = selected.status === "REJECTED" && index === 1;
                    const classes = [s.step];
                    if (index <= current) classes.push(s.stepOn);
                    if (index < current) classes.push(s.stepDone);
                    if (declined) classes.push(s.stepBad);

                    return (
                      <li key={label} className={classes.join(" ")}>
                        {declined ? "Declined" : label}
                      </li>
                    );
                  })}
                </ol>

                {(selected.beforePhotoUrls.length > 0 || selected.afterPhotoUrls.length > 0) && (
                  <div className={s.panelBlock}>
                    <h4 className={s.panelHeading}>Before and after</h4>

                    <div className={s.beforeAfter}>
                      <div className={s.photoBlock}>
                        <span className={s.photoLabel}>Before</span>
                        {selected.beforePhotoUrls.length > 0 ? (
                          <Photos urls={selected.beforePhotoUrls} label="Before" />
                        ) : (
                          <p className={s.muted}>None</p>
                        )}
                      </div>

                      <div className={s.photoBlock}>
                        <span className={s.photoLabel}>After</span>
                        {selected.afterPhotoUrls.length > 0 ? (
                          <Photos urls={selected.afterPhotoUrls} label="After" />
                        ) : (
                          <p className={s.muted}>None</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selected.receiptUrl && (
                  <a href={selected.receiptUrl} target="_blank" rel="noopener noreferrer" className={s.receipt}>
                    View receipt
                    <Icon name="arrow" size={14} />
                  </a>
                )}

                {selectedLogs.length > 0 && (
                  <div className={s.panelBlock}>
                    <h4 className={s.panelHeading}>History</h4>

                    <ul className={s.miniLog}>
                      {selectedLogs.map((log) => (
                        <li key={log.id}>
                          <b>{log.action}</b>
                          <span>
                            {log.performedBy.name} ·{" "}
                            {new Date(log.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className={s.panelFoot}>
              {selected.status === "PENDING_APPROVAL" ? (
                <ApprovalActions requestId={selected.id} />
              ) : (
                <span className={s.result}>{RESULT_TEXT[selected.status] ?? ""}</span>
              )}

              <Link href={`/requests/${selected.id}`} className={s.link}>
                Open full page
                <Icon name="arrow" size={14} />
              </Link>
            </div>
          </aside>
        </>
      )}
    </DashboardLayout>
  );
}
