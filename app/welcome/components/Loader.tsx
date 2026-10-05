import { Logo } from "./Svg";

/** Intro splash. It hides itself with a CSS animation (see bcl-loaderOut). */
export default function Loader() {
  return (
    <div id="loader" aria-hidden="true">
      <div className="inner">
        <Logo n={9} />
        <div className="wm">BAYTAK CARE</div>
      </div>
    </div>
  );
}