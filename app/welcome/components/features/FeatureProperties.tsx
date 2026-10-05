import type { CSSProperties } from "react";
import { ART } from "../../data/art";

export default function FeatureProperties() {
  return (
  <article className="feature" id="owners">
    <div className="ftext">
      <div className="num mono"><b>01</b>Your properties</div>
      <h3 className="split" data-split="">{"Every home, "}<em className="s">one calm view.</em></h3>
      <p data-reveal="up">Your apartment, the family house, the place by the sea. Each one shows its condition, its caretaker and what’s open, without asking anyone.</p>
      <ul data-reveal="up" style={{ "--d": ".1s" } as CSSProperties}>
        <li>Current status</li>
        <li>Assigned caretaker</li>
        <li>Open requests</li>
        <li>Last inspection</li>
      </ul>
    </div>
    <div className="fvis">
      <div className="fan" id="fan">
        <div className="pc">
          <div className="pcard">
            <div className="img">
              <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a modern Beirut apartment building with balconies, rooftop water tanks and solar panels" dangerouslySetInnerHTML={{ __html: ART.PROPERTY_CARD_SCENE_1 }} />
              <span className="pill glass good">Healthy</span>
            </div>
            <div className="body">
              <h4>City apartment</h4>
              <div className="meta">
                <div>
                  <span className="mono">Caretaker</span>
                  <b>Assigned</b>
                </div>
                <div>
                  <span className="mono">Inspected</span>
                  <b>This month</b>
                </div>
                <div>
                  <span className="mono">Open</span>
                  <b>2 requests</b>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pc">
          <div className="pcard">
            <div className="img">
              <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a traditional Lebanese triple-arch stone house in the mountains" dangerouslySetInnerHTML={{ __html: ART.PROPERTY_CARD_SCENE_2 }} />
              <span className="pill glass info">Service scheduled</span>
            </div>
            <div className="body">
              <h4>Mountain house</h4>
              <div className="meta">
                <div>
                  <span className="mono">Caretaker</span>
                  <b>Assigned</b>
                </div>
                <div>
                  <span className="mono">Inspected</span>
                  <b>This month</b>
                </div>
                <div>
                  <span className="mono">Open</span>
                  <b>1 request</b>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pc">
          <div className="pcard">
            <div className="img">
              <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of a white modernist house on the coast with a pool and the sea behind" dangerouslySetInnerHTML={{ __html: ART.PROPERTY_CARD_SCENE_3 }} />
              <span className="pill glass good">Healthy</span>
            </div>
            <div className="body">
              <h4>Sea house</h4>
              <div className="meta">
                <div>
                  <span className="mono">Caretaker</span>
                  <b>Assigned</b>
                </div>
                <div>
                  <span className="mono">Inspected</span>
                  <b>This month</b>
                </div>
                <div>
                  <span className="mono">Open</span>
                  <b>1 request</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </article>
  );
}