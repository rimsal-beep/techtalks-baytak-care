import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon, Logo } from "./Svg";

export default function Nav() {
  return (
    <>
  <header className="nav" id="nav">
    <div className="bar">
      <a href="#top" className="brand" aria-label="Baytak Care home"><Logo n={9} />BAYTAK CARE</a>
      <nav className="links" aria-label="Main">
        <a href="#product">Product</a>
        <a href="#how">How it works</a>
        <a href="#features">Features</a>
        <a href="#owners">For Owners</a>
        <a href="#about">About</a>
      </nav>
      <div className="right">
        <Link href="/login" className="signin">Sign in</Link>
        <Link href="/signup" className="btn" data-magnetic="">
          Get started
          <span className="ic">
            <Icon name="arrow" />
          </span>
        </Link>
        <button className="menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false">
          <span></span>
        </button>
      </div>
    </div>
  </header>
  <nav className="mnav" id="mnav" aria-label="Mobile">
    <a href="#product" style={{ "--i": "0" } as CSSProperties}>Product</a>
    <a href="#how" style={{ "--i": "1" } as CSSProperties}>How it works</a>
    <a href="#features" style={{ "--i": "2" } as CSSProperties}>Features</a>
    <a href="#owners" style={{ "--i": "3" } as CSSProperties}>For Owners</a>
    <Link href="/login" style={{ "--i": "4" } as CSSProperties}>Sign in</Link>
    <Link href="/signup" className="btn light">
      Get started
      <span className="ic">
        <Icon name="arrow" />
      </span>
    </Link>
  </nav>
    </>
  );
}