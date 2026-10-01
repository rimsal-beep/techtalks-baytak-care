import type { CSSProperties } from "react";

export default function FeatureChecklists() {
  return (
  <article className="feature">
    <div className="ftext">
      <div className="num mono"><b>03</b>Monthly checklists</div>
      <h3 className="split" data-split="">{"The same careful check, "}<em className="s">every month.</em></h3>
      <p data-reveal="up">A standard inspection your caretaker completes room by room. You see what was checked, when, and anything that needs a second look.</p>
      <ul data-reveal="up" style={{ "--d": ".1s" } as CSSProperties}>
        <li>Ticked on site</li>
        <li>Time-stamped</li>
        <li>Notes and photos</li>
        <li>Completion score</li>
      </ul>
    </div>
    <div className="fvis">
      <div className="check-demo" id="checkDemo">
        <div className="head">
          <span className="mono">Monthly property check</span>
          <h4>Your home</h4>
          <p>Completed by your caretaker</p>
        </div>
        <div className="ring" id="ring">
          <svg viewBox="0 0 132 132">
            <circle className="bg" cx="66" cy="66" r="58" />
            <circle className="fg" cx="66" cy="66" r="58" strokeDasharray="364.4" strokeDashoffset="364.4" />
          </svg>
          <div className="val">
            <div>
              <b className="tnum"><span id="ringVal">0</span>%</b>
              <span className="mono lbl">complete</span>
            </div>
          </div>
        </div>
        <ul className="clist" id="clist">
          <li>
            <span className="cb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            Check electricity
          </li>
          <li>
            <span className="cb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            Check water system
          </li>
          <li>
            <span className="cb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            {"Check doors & windows"}
          </li>
          <li>
            <span className="cb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            Check for leaks
          </li>
          <li>
            <span className="cb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            Check appliances
          </li>
          <li>
            <span className="cb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            General property condition
          </li>
        </ul>
      </div>
    </div>
  </article>
  );
}