import { Icon } from "./Svg";

export default function Solution() {
  return (
  <section className="section solution" id="solution">
    <div className="wrap">
      <div className="sec-head">
        <div>
          <div className="kicker mono dark">The answer</div>
          <h2 className="split" data-split="">{"Everything your property needs. "}<em className="s">In one place.</em></h2>
        </div>
        <p data-reveal="up">Requests, inspections, photos and approvals live together, organised by home. Your caretaker updates it from their phone; you see it wherever you are.</p>
      </div>
      <div className="stage" id="stage">
        <div className="frame" id="solFrame">
          <div className="chrome">
            <div className="dots">
              <i></i>
              <i></i>
              <i></i>
            </div>
            <div className="url"><Icon name="lock" />app.baytakcare.com/overview</div>
          </div>
          <div className="viewport vp-sol">
            <picture>
                                         <source media="(max-width: 1024px)" srcSet="/landing/sol-phone.webp?v=2" />
              {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot */}
                                       <img src="/landing/sol-desktop.webp?v=2" alt="Baytak Care owner dashboard preview" width={1440} height={900} loading="lazy" decoding="async" />
            </picture>
          </div>
        </div>
       
        <div className="callout c3" data-depth="-60">
          <span className="mono">Live activity</span>
          <b>6 new photos uploaded</b>
        </div>
      </div>
    </div>
  </section>
  );
}