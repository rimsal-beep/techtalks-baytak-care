import { Logo } from "./Svg";

export default function Footer() {
  return (
  <footer className="foot" data-dark="">
    <div className="wrap">
      <div className="top">
        <div>
          <a className="brand" href="#top" style={{ color: "var(--sand)" }}><Logo n={9} />BAYTAK CARE</a>
          <p>Your home, cared for from anywhere.</p>
        </div>
        <div>
          <h5 className="mono">Product</h5>
          <ul>
            <li>
              <a href="#product">Product</a>
            </li>
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#how">How it works</a>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="mono">Company</h5>
          <ul>
            <li>
              <a href="#about">About</a>
            </li>
            <li>
              <a href="#final">Contact</a>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="mono">Legal</h5>
          <ul>
            <li>
              <a href="#top">Privacy</a>
            </li>
            <li>
              <a href="#top">Terms</a>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="legal">
        <span>© 2026 Baytak Care.</span>
        <span>Made between Beirut and everywhere else.</span>
      </div>
    </div>
  </footer>
  );
}