import Link from "next/link";
import { Icon } from "./Svg";
import { SCENES } from "../data/scenes";

export default function FinalCta() {
  return (
  <section className="final" data-dark="" id="final">
    <div className="bg" id="finalBg" dangerouslySetInnerHTML={{ __html: SCENES["mountain:dusk"] }} />
    <div className="wrap content">
      <h2 className="split" data-split="">{"Your home is always "}<em className="s">within reach.</em></h2>
      <div className="row">
        <p data-reveal="up">Stay connected to your property, wherever life takes you.</p>
        <Link href="/signup" className="btn light" data-magnetic="">
          Get started
          <span className="ic">
            <Icon name="arrow" />
          </span>
        </Link>
      </div>
    </div>
  </section>
  );
}