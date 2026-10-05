import type { CSSProperties } from "react";

export default function Trust() {
  return (
  <section className="section trust on-navy" id="about" data-dark="">
    <div className="wrap">
      <div className="tgrid">
        <div>
          <div className="kicker mono">Peace of mind</div>
          <h2 className="split" data-split="">{"Know what’s happening "}<em className="s">at home.</em></h2>
          <p className="tl" data-reveal="up">Every visit and fix is written down as it happens. When family asks how the house is, you already know.</p>
        </div>
        <div className="stats">
          <div className="stat" data-reveal="up">
            <b>
              <span data-count="12">12</span>
            </b>
            <span>inspections completed</span>
          </div>
          <div className="stat" data-reveal="up" style={{ "--d": ".08s" } as CSSProperties}>
            <b>
              <span data-count="4">4</span>
            </b>
            <span>maintenance requests</span>
          </div>
          <div className="stat" data-reveal="up" style={{ "--d": ".24s" } as CSSProperties}>
            <b><span data-count="100">100</span>%</b>
            <span>activity history</span>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
}