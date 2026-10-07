import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import styles from "./Caretaker.module.css";
import { STATUS } from "./status";
import type { CaretakerRequest } from "./data";

/* ---------- icons ---------- */
const ICONS = {
  home: <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  wrench: <path d="M14.5 4.5a4.5 4.5 0 0 0-4.3 5.8L4 16.5 7.5 20l6.2-6.2a4.5 4.5 0 0 0 5.8-4.3l-2.7 2.7-2.6-.6-.6-2.6z" />,
  list: <path d="M10.5 6H20M10.5 12H20M10.5 18H20M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17" />,
  chev: <path d="M6 9l6 6 6-6" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4.5M12 17.3v.1" />
    </>
  ),
  logout: <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 16l-4-4 4-4M6 12h10" />,
  drop: <path d="M12 3.5s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  bolt: <path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  door: <path d="M6 21V4h12v17M3 21h18M14.5 12.5v.1" />,
  snow: <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  arrowL: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowD: <path d="M12 5v14M6 13l6 6 6-6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </>
  ),
  cal: <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />,
  tag: (
    <>
      <path d="M3.5 12.5V4h8.5l8.5 8.5-8 8z" />
      <circle cx="8" cy="8.5" r="1.4" />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3.3-3.3a4 4 0 0 0-5.7-5.7L12 6.3M14 10a4 4 0 0 0-5.7 0L5 13.3A4 4 0 0 0 10.7 19L12 17.7" />,
  file: <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M20.5 16l-5-5-8 8" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={`${styles.ic} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

/** One icon per checklist item, in the same order as CHECKLIST_ITEMS. */
export const CHECKLIST_ICONS: IconName[] = ["drop", "bolt", "door", "snow", "eye"];

const LOGO_PATH =
  "M6 104V46Q6 42 9.5 39.5L56 6Q60 3 64 6L110.5 39.5Q114 42 114 46V129Q114 134 109 134H34Q29 134 29 129V62.5A11.85 11.85 0 0 1 52.7 62.5V84.7H70A12.9 12.9 0 0 1 70 110.5H11Q6 110.5 6 105.5Z";

export function Logo({ strokeWidth = 9 }: { strokeWidth?: number }) {
  return (
    <svg viewBox="-4 -4 128 148" fill="none" aria-hidden="true">
      <path
        d={LOGO_PATH}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------- small shared pieces ---------- */
export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: "wait" as const };
  return <span className={`${styles.pill} ${styles[s.tone]}`}>{s.label}</span>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyArt}>
        <Logo strokeWidth={10} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

const CIRC = 2 * Math.PI * 46; // 289.03, same number used in the CSS

export function Ring({ done, total }: { done: number; total: number }) {
  const offset = CIRC * (1 - (total ? done / total : 0));
  return (
    <div className={`${styles.ring} ${done === total && total > 0 ? styles.ringFull : ""} ${done === 0 ? styles.ringEmpty : ""}`}>
      <svg viewBox="0 0 104 104">
        <circle className={styles.ringBg} cx="52" cy="52" r="46" />
        <circle
          className={styles.ringFg}
          cx="52"
          cy="52"
          r="46"
          style={{ "--off": offset } as CSSProperties}
        />
      </svg>
      <div className={styles.ringV}>
        <div>
          <b>
            {done}
            <small>/{total}</small>
          </b>
          <em>done</em>
        </div>
      </div>
    </div>
  );
}

export function RequestRow({
  request,
  index,
  showAddress,
}: {
  request: CaretakerRequest;
  index: number;
  showAddress: boolean;
}) {
  const photo = request.issuePhotoUrls?.[0];
  const date = new Date(request.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const cost =
    request.estimatedCost !== null && request.estimatedCost !== undefined
      ? ` · Est. ${request.currency === "LBP" ? "LBP " : "$"}${Number(request.estimatedCost).toLocaleString("en-US")}`
      : "";

  return (
    <Link
      href={`/caretaker/dashboard/requests/${request.id}`}
      className={`${styles.rq} ${styles.rise}`}
      style={{ "--i": index + 1 } as CSSProperties}
    >
      <span className={styles.rqTh}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : (
          <Icon name="wrench" />
        )}
      </span>
      <span className={styles.rqTt}>
        <b>{request.title}</b>
        <span>
          {showAddress ? `${request.property.address} · ` : ""}
          {date}
          {cost}
        </span>
        {request.status === "REJECTED" && (
          <span className={styles.reason}>
            Reason: {request.rejectionReason?.trim() || "No reason recorded."}
          </span>
        )}
      </span>
      <StatusPill status={request.status} />
      <Icon name="arrow" className={styles.ga} />
    </Link>
  );
}

/** "Something wrong?" link used in a few places. */
export function reportHref(propertyId: string) {
  return `/requests/new?propertyId=${encodeURIComponent(propertyId)}`;
}

/** Sets the stagger delay used by the entrance animation. */
export const rise = (i: number) => ({ "--i": i }) as CSSProperties;
