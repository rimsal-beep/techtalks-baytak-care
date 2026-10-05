import type { CSSProperties } from "react";
import RequestDemo from "./RequestDemo";

export default function FeatureRequests() {
  return (
  <article className="feature flip">
    <div className="ftext">
      <div className="num mono"><b>02</b>Maintenance requests</div>
      <h3 className="split" data-split="">{"Nothing gets fixed "}<em className="s">without you knowing.</em></h3>
      <p data-reveal="up">Your caretaker reports the problem with photos and a quote. You approve or decline in one tap, and the decision is recorded against the home.</p>
      <ul data-reveal="up" style={{ "--d": ".1s" } as CSSProperties}>
        <li>Photos from the visit</li>
        <li>Estimated cost</li>
        <li>One-tap approval</li>
        <li>Full request history</li>
      </ul>
    </div>
    <div className="fvis">
      <RequestDemo />
    </div>
  </article>
  );
}