import Link from "next/link";
import styles from "./Caretaker.module.css";
import PageHead from "./PageHead";
import NoProperty from "./NoProperty";
import { EmptyState, Icon, Logo, Ring, RequestRow, reportHref, rise } from "./parts";
import { getCaretakerData, monthProgress, pickProperty } from "./data";
import { CHECKLIST_ITEMS } from "@/lib/checklistItems";

export default async function CaretakerOverview({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const { user, properties, requests } = await getCaretakerData();
  const property = pickProperty(properties, (await searchParams).property);
  if (!property) return <NoProperty />;

  const ownerName = property.owner?.name ?? "the owner";
  const ownerFirst = ownerName.split(" ")[0];
  const firstName = user.name.split(" ")[0];

  const { done, total, doneAt } = monthProgress(property, CHECKLIST_ITEMS);
  const full = done === total;
  const next = CHECKLIST_ITEMS.find((t) => !doneAt.has(t));
  const left = total - done;

  const mine = requests.filter((r) => r.propertyId === property.id);
  const waiting = mine.filter((r) => r.status === "PENDING_APPROVAL").length;
  const completed = mine.filter((r) => r.status === "COMPLETED").length;
  const q = (extra: string) => `/caretaker/dashboard/requests?property=${property.id}${extra}`;

  return (
    <>
      <PageHead
        firstName={firstName}
        subtitle="Here’s your property today."
        properties={properties}
        currentId={property.id}
      />

      <div className={`${styles.prow} ${styles.rise}`} style={rise(1)}>
        <span className={styles.pimg}>
          <Logo />
        </span>
        <span className={styles.pmain}>
          <span className={styles.mono}>Your property</span>
          <b>{property.address}</b>
          <span className={styles.ploc}>
            <Icon name="pin" />
            {property.city ? `${property.city} · ` : ""}Owner {ownerName}
          </span>
        </span>
      </div>

      <section className={`${styles.today} ${styles.rise}`} style={rise(2)}>
        <Link href={`/caretaker/dashboard/checklist?property=${property.id}`} className={styles.tcard}>
          <div className={styles.tcTop}>
            <Ring done={done} total={total} />
            <div>
              <span className={styles.mono}>Monthly checklist</span>
              <h3>{full ? "All checks done 🎉" : `${left} check${left === 1 ? "" : "s"} left`}</h3>
              <p>
                {full
                  ? "Everything at this property has been checked this month."
                  : `Next: ${next?.replace("Check ", "")}`}
              </p>
            </div>
          </div>
          <span className={styles.tcGo}>
            {full ? "View checklist" : "Continue checklist"}
            <Icon name="arrow" />
          </span>
        </Link>

        <div className={styles.rcard}>
          <span className={styles.rcardIcon}>
            <Icon name="alert" />
          </span>
          <h3>Something wrong at the property?</h3>
          <p>Report it with a photo and an estimated cost. {ownerFirst} will approve it.</p>
          <Link href={reportHref(property.id)} className={`${styles.btn} ${styles.btnLight} ${styles.btnLg}`}>
            <Icon name="plus" />
            Report an issue
          </Link>
        </div>
      </section>

      <section className={`${styles.sec} ${styles.rise}`} style={rise(3)}>
        <div className={styles.secH}>
          <div>
            <h2>Your requests</h2>
            <p className={styles.sub}>Issues you reported and what the owner decided.</p>
          </div>
          <Link href={q("")} className={styles.more}>
            All requests
            <Icon name="arrow" />
          </Link>
        </div>

        <div className={styles.counts}>
          <Link href={q("")} className={styles.cnt}>
            <b>{mine.length}</b>
            <span>Total requests</span>
          </Link>
          <Link href={q("&status=waiting")} className={`${styles.cnt} ${waiting ? styles.cntHot : ""}`}>
            <b>{waiting}</b>
            <span>Awaiting approval</span>
          </Link>
          <Link href={q("&status=completed")} className={styles.cnt}>
            <b>{completed}</b>
            <span>Completed</span>
          </Link>
        </div>

        <div className={styles.rlist}>
          {mine.length ? (
            mine.slice(0, 3).map((r, i) => <RequestRow key={r.id} request={r} index={i} showAddress={false} />)
          ) : (
            <EmptyState title="No requests yet" text="When you report an issue, it will appear here." />
          )}
        </div>
      </section>
    </>
  );
}