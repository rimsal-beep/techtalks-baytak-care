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
      <div className={wide ? `${s.card} ${s.cardWide}` : s.card}>
        <div className={s.brand}>
          <BrandMark size={24} />
          <span>Baytak Care</span>
        </div>

        {children}
      </div>
    </main>
  );
}