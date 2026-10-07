import Link from "next/link";
import styles from "../Caretaker.module.css";
import PageHead from "../PageHead";
import NoProperty from "../NoProperty";
import { EmptyState, Icon, RequestRow, reportHref, rise } from "../parts";
import { getCaretakerData, pickProperty } from "../data";
import { TABS } from "../status";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const { properties, requests } = await getCaretakerData();
  const property = pickProperty(properties, sp.property);
  if (!property) return <NoProperty />;

  const mine = requests.filter((r) => r.propertyId === property.id);
  // only accept a status from our own list; anything else means "all"
  const tab = TABS.find((t) => t.key === sp.status) ?? TABS[0];
  const list = tab.key === "all" ? mine : mine.filter((r) => tab.match.includes(r.status));

  const count = (t: (typeof TABS)[number]) => (t.key === "all" ? mine.length : mine.filter((r) => t.match.includes(r.status)).length);
  const href = (key: string) =>
    `/caretaker/dashboard/requests?property=${property.id}${key === "all" ? "" : `&status=${key}`}`;

  return (
    <>
      <PageHead
        title={
          <>
            Your <em className={styles.serif}>requests</em>
          </>
        }
        subtitle="Issues you reported at this property. Tap one to see the details."
        properties={properties}
        currentId={property.id}
      />

      <section className={`${styles.secTight} ${styles.rise}`} style={rise(1)}>
        <div className={styles.secH}>
          <nav className={styles.tabs} aria-label="Filter requests">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={href(t.key)}
                className={`${styles.tab} ${t.key === tab.key ? styles.tabOn : ""}`}
                aria-current={t.key === tab.key ? "page" : undefined}
              >
                {t.label} · {count(t)}
              </Link>
            ))}
          </nav>
          <Link href={reportHref(property.id)} className={styles.btn}>
            <Icon name="plus" />
            Report an issue
          </Link>
        </div>

        <div className={styles.rlist} style={{ marginTop: 0 }}>
          {list.length ? (
            list.map((r, i) => <RequestRow key={r.id} request={r} index={i} showAddress={false} />)
          ) : (
            <EmptyState
              title={tab.key === "waiting" ? "Nothing waiting" : "No requests here"}
              text={
                tab.key === "waiting"
                  ? "Everything you reported has an answer from the owner."
                  : "Requests with this status will appear here."
              }
            />
          )}
        </div>
      </section>
    </>
  );
}