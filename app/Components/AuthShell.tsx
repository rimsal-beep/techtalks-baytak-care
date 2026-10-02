import type { ReactNode } from "react";
import BrandMark from "./BrandMark";
import { PropertyArt } from "../properties/PropertyUI";
import s from "./AuthShell.module.css";

/**
 * The frame shared by the login and signup pages: a navy brand panel on the left
 * (hidden on phones) and the form on the right. Pass `wide` for the signup form.
 */
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

        <div>
          <p className={s.headline}>
            Your home, <em>cared for</em> from anywhere.
          </p>
          <p className={s.lead}>
            Monitor, maintain and stay connected to your property, even when you&apos;re miles away.
          </p>
        </div>

        <div className={s.art}>
          <PropertyArt seed="baytak-auth" viewBox="0 40 800 440" />
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
