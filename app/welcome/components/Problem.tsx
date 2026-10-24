

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
                  </div>
      </div>
    </div>
  </section>
  );
}