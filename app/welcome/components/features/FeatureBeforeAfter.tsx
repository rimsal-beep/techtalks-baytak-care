import { Icon } from "../Svg";
import { SCENES } from "../../data/scenes";

export default function FeatureBeforeAfter() {
  return (
  <div className="wrap ba-wrap" style={{ borderTop: "1px solid var(--line)", paddingBlock: "clamp(70px,9vw,130px)" }}>
    <div className="ba-head">
      <div>
        <div className="num mono" style={{ display: "flex", gap: "14px", alignItems: "center", color: "var(--ink-3)" }}>
          <b style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontWeight: "400", fontSize: "44px", color: "var(--navy)", lineHeight: "1", textTransform: "none" }}>04</b>
          {"Before & after"}
        </div>
        <h3 className="split" data-split="" style={{ marginTop: "22px" }}>{"See the work, "}<em className="s">not just the bill.</em></h3>
      </div>
      <p data-reveal="up" style={{ color: "var(--ink-2)", fontSize: "17.5px", maxWidth: "24em" }}>Every job closes with photos taken before and after. Drag to compare.</p>
    </div>
    <div className="ba" id="ba" data-reveal="mask" data-cursor="Drag" role="slider" aria-label="Compare before and after" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50} tabIndex={0}>
      <div className="layer before" dangerouslySetInnerHTML={{ __html: SCENES["sink:before:bath"] }} />
      <div className="layer after" dangerouslySetInnerHTML={{ __html: SCENES["sink:after:bath"] }} />
      <span className="lbl l">BEFORE</span>
      <span className="lbl r">AFTER</span>
      <div className="handle">
        <div className="knob">
          <Icon name="drag" />
        </div>
      </div>
    </div>
    <div className="ba-meta" data-reveal="up">
      <div>
        <span className="mono">Job</span>
        <b>Faucet replacement</b>
      </div>
      <div>
        <span className="mono">Photos</span>
        <b>Before and after</b>
      </div>
      <div>
        <span className="mono">Status</span>
        <b>Completed</b>
      </div>
      <div>
        <span className="mono">Approved</span>
        <b>By you</b>
      </div>
    </div>
  </div>
  );
}