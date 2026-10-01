import Link from "next/link";
import DashboardLayout from "../Components/DashBoardCom/DashBoardLayout";
import style from "../Style/DashboardStyle.module.css";
import listStyle from "../properties/Properties.module.css";
import s from "./Dashboard.module.css";
import Greeting from "./Greeting";
import { Icon, PropertyArt } from "../properties/PropertyUI";
import type { StatusTone } from "../properties/propertyHelpers";

type AttentionItem = {
  id: string;
  title: string;
  propertyId: string;
  address: string;
  cost: string | null;
  photo: string | null;
};

type CheckItem = {
  id: string;
  address: string;
  done: number;
  total: number;
};

type PropertyItem = {
  id: string;
  address: string;
  city: string | null;
  statusLabel: string;
  tone: StatusTone;
};

type DashboardProps = {
  userName: string;
  firstName: string;
  totalProperties: number;
  unassigned: number;
  awaiting: number;
  inProgress: number;
  attention: AttentionItem[];
  checks: CheckItem[];
  properties: PropertyItem[];
};

const PILL_TONE = {
  good: listStyle.pillGood,
  warn: listStyle.pillWarn,
  info: listStyle.pillInfo,
  muted: "",
} as const;

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The first sentence of the header band. Only says "in good hands" when every home has a caretaker. */
function describeHomes(total: number, unassigned: number): { lead: string; accent?: string } {
  if (unassigned > 0) {
    return {
      lead:
        total === 1
          ? "Your home still needs a caretaker."
          : `${capital(numberWord(unassigned))} of your ${numberWord(total)} homes still ${unassigned === 1 ? "needs" : "need"} a caretaker.`,
    };
  }

  if (total === 1) return { lead: "Your home is", accent: "in good hands." };
  if (total === 2) return { lead: "Both homes are", accent: "in good hands." };

  return { lead: `All ${numberWord(total)} homes are`, accent: "in good hands." };
}

function describeApprovals(awaiting: number) {
  if (awaiting === 0) return "Nothing needs you today.";

  return `${capital(numberWord(awaiting))} ${awaiting === 1 ? "thing needs" : "things need"} your approval.`;
}

export function Dashboard({
  userName,
  firstName,
  totalProperties,
  unassigned,
  awaiting,
  inProgress,
  attention,
  checks,
  properties,
}: DashboardProps) {
  const homes = describeHomes(totalProperties, unassigned);

  return (
    <DashboardLayout activePage="dashboard" userName={userName}>
      <header className={s.top}>
        <h1 className={s.title}>
          <Greeting />, <em>{firstName}</em>
        </h1>

        {/* Notifications are coming later, so this is only a button for now. */}
        <button type="button" className={s.bell} aria-label="Notifications" title="Notifications (coming soon)">
          <Icon name="bell" size={18} />
        </button>
      </header>

      {totalProperties === 0 ? (
        <div className={style.emptyState}>
          <h3>No properties yet</h3>
          <p>Add your first property to get started.</p>

          <Link href="/properties/new" className={style.addButton}>
            Add Property
          </Link>
        </div>
      ) : (
        <>
          <section className={s.band}>
            <p className={s.bandTitle}>
              {homes.lead}
              {homes.accent && (
                <>
                  {" "}
                  <em>{homes.accent}</em>
                </>
              )}{" "}
              {describeApprovals(awaiting)}
            </p>

            <div className={s.kpis}>
              <Link href="/properties" className={s.kpi}>
                <span className={s.kpiLabel}>Properties</span>
                <span className={s.kpiValue}>{totalProperties}</span>
              </Link>

              <Link
                href="/requests/pending-approvals"
                className={awaiting > 0 ? `${s.kpi} ${s.kpiHot}` : s.kpi}
              >
                <span className={s.kpiLabel}>Awaiting approval</span>
                <span className={s.kpiValue}>{awaiting}</span>
              </Link>

              <Link href="/requests" className={s.kpi}>
                <span className={s.kpiLabel}>In progress</span>
                <span className={s.kpiValue}>{inProgress}</span>
              </Link>
            </div>
          </section>

          <div className={s.grid}>
            <section className={attention.length === 0 ? `${s.attention} ${s.attentionEmpty}` : s.attention}>
              <div className={s.blockHead}>
                <h3 className={s.blockTitle}>Needs your attention</h3>
                {awaiting > 0 && <span className={s.count}>{awaiting} waiting</span>}
              </div>

              {attention.length === 0 ? (
                <div className={s.caughtUp}>
                  <span>
                    <Icon name="check" size={16} />
                  </span>
                  You&apos;re all caught up.
                </div>
              ) : (
                <>
                  {attention.map((item) => (
                    <div key={item.id} className={s.appr}>
                      <span className={s.thumb}>
                        {item.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element -- uploaded photo, shown as a thumbnail
                          <img src={item.photo} alt="" />
                        ) : (
                          <Icon name="wrench" size={20} />
                        )}
                      </span>

                      <div className={s.apprText}>
                        <b>{item.title}</b>
                        <span>{item.address}</span>
                      </div>

                      {item.cost && (
                        <div className={s.cost}>
                          <small>Estimated</small>
                          <b>{item.cost}</b>
                        </div>
                      )}

                      <Link
                        href={`/properties/${item.propertyId}?tab=requests&request=${item.id}`}
                        className={s.review}
                      >
                        Review
                      </Link>
                    </div>
                  ))}

                  {awaiting > attention.length && (
                    <Link href="/requests/pending-approvals" className={s.more}>
                      See all {awaiting}
                      <Icon name="arrow" size={14} />
                    </Link>
                  )}
                </>
              )}
            </section>

            <section className={s.checks}>
              <div className={s.blockHead}>
                <h3 className={s.blockTitle}>Property checks</h3>
              </div>

              {checks.map((check) => (
                <Link key={check.id} href={`/properties/${check.id}?tab=checklist`} className={s.check}>
                  <div className={s.checkTop}>
                    <span className={s.checkName}>{check.address}</span>
                    <span className={s.checkFrac}>
                      {check.done}/{check.total}
                    </span>
                  </div>

                  <div className={check.done === check.total ? `${s.bar} ${s.barDone}` : s.bar}>
                    <i style={{ width: `${(check.done / check.total) * 100}%` }} />
                  </div>
                </Link>
              ))}
            </section>
          </div>

          <section>
            <div className={s.sectionHead}>
              <h3 className={s.sectionTitle}>Your properties</h3>

              <Link href="/properties" className={s.link}>
                View all
                <Icon name="arrow" size={14} />
              </Link>
            </div>

            <div className={s.props}>
              {properties.map((property) => (
                <Link key={property.id} href={`/properties/${property.id}`} className={listStyle.card}>
                  <div className={listStyle.image}>
                    <PropertyArt seed={property.id} />

                    <span className={`${listStyle.pill} ${PILL_TONE[property.tone]}`}>
                      {property.statusLabel}
                    </span>

                    <span className={listStyle.go}>
                      <Icon name="arrow" size={16} />
                    </span>
                  </div>

                  <div className={s.propBody}>
                    <h3 className={listStyle.title}>{property.address}</h3>

                    {property.city && (
                      <p className={listStyle.loc}>
                        <Icon name="pin" size={13} />
                        {property.city}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
