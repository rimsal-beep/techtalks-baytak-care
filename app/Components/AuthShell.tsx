import type { ReactNode } from "react";
import BrandMark from "./BrandMark";
import s from "./AuthShell.module.css";

export default function AuthShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className={s.page}>
      <aside className={s.panel}>
        <div className={s.panelBrand}>
          <BrandMark size={26} />
          <span>Baytak Care</span>
        </div>

        <div className={s.copy}>
          <p className={s.headline}>
            Your home, <em>cared for</em> from anywhere.
          </p>
          <p className={s.lead}>
            Monitor, maintain and stay connected to your property, even when you&apos;re miles away.
          </p>
        </div>
      </aside>

      <div className={s.main}>
        <div className={wide ? `${s.card} ${s.cardWide}` : s.card}>
          <div className={s.mobileBrand}>
            <BrandMark size={22} />
            <span>Baytak Care</span>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}