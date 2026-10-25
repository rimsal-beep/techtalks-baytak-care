import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "./Svg";
import { SCENES } from "../data/scenes";
// Make the scene fill the arch instead of leaving empty bands.
const HERO_SCENE = SCENES["mountain:gold"]
  .replace(/\spreserveAspectRatio="[^"]*"/, "")
  .replace("<svg", '<svg preserveAspectRatio="xMidYMid slice"');
export default function Hero() {
  return (
  <section className="hero" id="product">
    <div className="wrap">
      <div className="grid">
        <div className="hero-copy">
         
          <h1 className="split" data-split="" style={{ "--d": ".9s" } as CSSProperties}>{"Your home, "}<em className="s">cared for</em>{" from anywhere."}</h1>
          <p className="lede fade-seq" style={{ "--i": "0" } as CSSProperties}>Baytak Care gives you one simple place to monitor, maintain, and stay connected to your property — even when you’re miles away.</p>
          <div className="ctas fade-seq" style={{ "--i": "1" } as CSSProperties}>
            <Link href="/signup" className="btn" data-magnetic="">
              Explore Baytak Care
              <span className="ic">
                <Icon name="arrow" />
              </span>
            </Link>
            <a className="btn ghost" href="#how">
              <span className="play">
                <Icon name="play" />
              </span>
              See how it works
            </a>
          </div>
        </div>
        <div className="hero-visual" id="heroVisual">
          <div className="arch">
            <div className="scene" id="heroScene" dangerouslySetInnerHTML={{ __html: SCENES["mountain:gold"] }} />
          </div>
         <div className="float f1" style={{ display: "none", "--i": "0" } as CSSProperties} data-depth="1.6">
            <div className="float-inner" style={{ "--i": "0" } as CSSProperties}>
              <span className="ico" style={{ background: "var(--good-bg)", color: "var(--good)" }}>
                <Icon name="check" />
              </span>
              <div>
                <div className="t">Monthly inspection completed</div>
                <div className="sub">All checks done</div>
              </div>
            </div>
          </div>
          <div className="float f2" style={{ display: "none", "--i": "1" } as CSSProperties} data-depth="2.2">
            <div className="float-inner" style={{ "--i": "1" } as CSSProperties}>
              <span className="ico" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
                <Icon name="wrench" />
              </span>
              <div>
                <div className="t">Maintenance request</div>
                <div className="sub">Photos and estimate attached</div>
                <div className="mini-actions">
                  <span>Approve</span>
                  <span>Review</span>
                </div>
              </div>
            </div>
          </div>
          <div className="float f3" style={{ display: "none", "--i": "2" } as CSSProperties} data-depth="1.2">
            <div className="float-inner" style={{ "--i": "2" } as CSSProperties}>
              <span className="ico" style={{ background: "var(--info-bg)", color: "var(--info)" }}>
                <Icon name="camera" />
              </span>
              <div>
                <div className="t">New photos uploaded</div>
                <div className="sub">From your caretaker</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
}