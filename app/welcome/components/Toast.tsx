import { Icon } from "./Svg";

/** Small confirmation popup used by the request demo (see toast.ts). */
export default function Toast() {
  return (
    <div className="toast" id="toast" role="status" aria-live="polite">
      <span className="ico">
        <Icon name="check" />
      </span>
      <span id="toastMsg"></span>
    </div>
  );
}