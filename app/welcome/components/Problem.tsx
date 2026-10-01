import { Icon, Logo } from "./Svg";
import { ART } from "../data/art";

export default function Problem() {
  return (
  <section className="problem on-navy" id="how" data-dark="">
    <div className="sticky">
      <div className="wrap">
        <div className="grid">
          <div>
            <div className="kicker mono">The problem</div>
            <h2 className="split" data-split="">{"Being away shouldn’t mean being "}<em className="s">out of touch.</em></h2>
            <div className="plist">
              <div className="pitem on" data-p="0">
                <span className="n mono">01</span>
                <div>
                  <h3>Endless messages</h3>
                  <p>
                    <span>Important property updates get buried inside conversations.</span>
                  </p>
                </div>
              </div>
              <div className="pitem" data-p="1">
                <span className="n mono">02</span>
                <div>
                  <h3>Unclear maintenance</h3>
                  <p>
                    <span>You don’t always know what happened, what was fixed, or what it cost.</span>
                  </p>
                </div>
              </div>
              <div className="pitem" data-p="2">
                <span className="n mono">03</span>
                <div>
                  <h3>No single view</h3>
                  <p>
                    <span>Photos, requests, inspections and updates are scattered everywhere.</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="pbar">
              <i id="pbar"></i>
            </div>
          </div>
          <div className="chat" id="chat">
            <div className="phone">
              <div className="ph-top">
                <span className="av ali">C</span>
                <div className="who">
                  <b>Your caretaker</b>
                  <span>Messages</span>
                </div>
                <span className="cnt" id="unread">0 unread</span>
              </div>
              <div className="msgs" id="msgs">
                <div className="msg ">Sabah el kheir! Passed by the apartment this morning</div>
                <div className="msg ">There’s water under the kitchen sink</div>
                <div className="msg photo">
                  <div className="ph">
                    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Leak under the kitchen sink" dangerouslySetInnerHTML={{ __html: ART.CHAT_PHOTO_1 }} />
                  </div>
                </div>
                <div className="msg me">Oh no. Is it serious?</div>
                <div className="msg voice">
                  <svg style={{ width: "12px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />
                  </svg>
                  <span className="wave">
                    <i style={{ height: "4px" }}></i>
                    <i style={{ height: "17.88330734633456px" }}></i>
                    <i style={{ height: "7.577575428375637px" }}></i>
                    <i style={{ height: "16.961405552588253px" }}></i>
                    <i style={{ height: "10.917586915940515px" }}></i>
                    <i style={{ height: "15.178819576728863px" }}></i>
                    <i style={{ height: "13.798245626309592px" }}></i>
                    <i style={{ height: "12.653919571318466px" }}></i>
                    <i style={{ height: "16.028265407990943px" }}></i>
                    <i style={{ height: "9.55436802382859px" }}></i>
                    <i style={{ height: "17.459564886313796px" }}></i>
                    <i style={{ height: "6.085986361398783px" }}></i>
                    <i style={{ height: "17.997100601997367px" }}></i>
                    <i style={{ height: "5.5209123359370675px" }}></i>
                    <i style={{ height: "17.605178240414087px" }}></i>
                    <i style={{ height: "9.026816956310356px" }}></i>
                    <i style={{ height: "16.309822863110142px" }}></i>
                    <i style={{ height: "12.198922759640165px" }}></i>
                    <i style={{ height: "14.197050749642342px" }}></i>
                    <i style={{ height: "14.82659045392709px" }}></i>
                    <i style={{ height: "11.407157605680334px" }}></i>
                    <i style={{ height: "16.73533340566935px" }}></i>
                  </span>
                </div>
                <div className="msg ">Plumber can come Thursday, maybe Friday</div>
                <div className="msg me">How much will it cost?</div>
                <div className="msg ">He said around 80, maybe a bit more</div>
                <div className="msg ">Fixed! sending pics</div>
                <div className="msg photo">
                  <div className="ph">
                    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="New chrome faucet after replacement" dangerouslySetInnerHTML={{ __html: ART.CHAT_PHOTO_2 }} />
                  </div>
                </div>
                <div className="msg me">Did you check the windows before the storm?</div>
                <div className="msg ">Which windows?</div>
                <div className="msg voice">
                  <svg style={{ width: "12px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />
                  </svg>
                  <span className="wave">
                    <i style={{ height: "4px" }}></i>
                    <i style={{ height: "17.88330734633456px" }}></i>
                    <i style={{ height: "7.577575428375637px" }}></i>
                    <i style={{ height: "16.961405552588253px" }}></i>
                    <i style={{ height: "10.917586915940515px" }}></i>
                    <i style={{ height: "15.178819576728863px" }}></i>
                    <i style={{ height: "13.798245626309592px" }}></i>
                    <i style={{ height: "12.653919571318466px" }}></i>
                    <i style={{ height: "16.028265407990943px" }}></i>
                    <i style={{ height: "9.55436802382859px" }}></i>
                    <i style={{ height: "17.459564886313796px" }}></i>
                    <i style={{ height: "6.085986361398783px" }}></i>
                    <i style={{ height: "17.997100601997367px" }}></i>
                    <i style={{ height: "5.5209123359370675px" }}></i>
                    <i style={{ height: "17.605178240414087px" }}></i>
                    <i style={{ height: "9.026816956310356px" }}></i>
                    <i style={{ height: "16.309822863110142px" }}></i>
                    <i style={{ height: "12.198922759640165px" }}></i>
                    <i style={{ height: "14.197050749642342px" }}></i>
                    <i style={{ height: "14.82659045392709px" }}></i>
                    <i style={{ height: "11.407157605680334px" }}></i>
                    <i style={{ height: "16.73533340566935px" }}></i>
                  </span>
                </div>
              </div>
            </div>
            <div className="organized" id="organized">
              <div className="oh">
                <Logo n={10} />
                <b>Your home</b>
                <span className="pill good">Healthy</span>
              </div>
              <ul>
                <li>
                  <span className="ico">
                    <Icon name="wrench" />
                  </span>
                  Kitchen faucet leak
                  <span className="r">Awaiting you</span>
                </li>
                <li>
                  <span className="ico">
                    <Icon name="list" />
                  </span>
                  Monthly inspection
                  <span className="r">8 of 10 done</span>
                </li>
                <li>
                  <span className="ico">
                    <Icon name="camera" />
                  </span>
                  6 photos
                  <span className="r">Uploaded</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
}