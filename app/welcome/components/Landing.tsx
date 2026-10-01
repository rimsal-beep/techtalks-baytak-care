import Loader from "./Loader";
import Cursor from "./Cursor";
import Toast from "./Toast";
import Nav from "./Nav";
import Hero from "./Hero";
import Problem from "./Problem";
import Solution from "./Solution";
import Features from "./Features";
import Trust from "./Trust";
import FinalCta from "./FinalCta";
import Footer from "./Footer";
import LandingMotion from "./LandingMotion";

/**
 * The marketing landing page, top to bottom. Each section is its own component,
 * so adding or reordering sections means editing this list.
 */
export default function Landing({ fontClassName = "" }: { fontClassName?: string }) {
  return (
    <div className={`bcl js view ${fontClassName}`.trim()} id="landing">
      <Loader />
      <Cursor />
      <Nav />
      <main id="top">
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <Trust />
        <FinalCta />
      </main>
      <Footer />
      <Toast />
      <LandingMotion />
    </div>
  );
}