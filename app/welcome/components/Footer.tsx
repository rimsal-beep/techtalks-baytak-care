import Link from "next/link";
import { Logo } from "./Svg";
import { CONTACT_EMAIL } from "@/lib/siteInfo";

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
          <h5 className="mono">Home</h5>
          <ul>
            <li>
              <a href="#product">Home</a>
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
              <a href={`mailto:${CONTACT_EMAIL}`}>Contact us</a>
            </li>
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="mono">Legal</h5>
          <ul>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/terms">Terms</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="legal">
        <span>&copy; 2026 Baytak Care. All rights reserved.</span>
        <span>Made between Beirut and everywhere else.</span>
      </div>
    </div>
  </footer>
  );
}