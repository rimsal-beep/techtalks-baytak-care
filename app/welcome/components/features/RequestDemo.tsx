"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Svg";
import { SCENES } from "../../data/scenes";
import { showToast } from "../../toast";

type Phase = "idle" | "loading-approve" | "loading-decline" | "approved" | "declined";

/** Interactive "approve or decline" card shown in the Maintenance requests feature. */
export default function RequestDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  function decide(approve: boolean) {
    if (phase !== "idle") return;
    setPhase(approve ? "loading-approve" : "loading-decline");
    const id = window.setTimeout(() => {
      setPhase(approve ? "approved" : "declined");
      showToast(approve ? "Approved. Your caretaker can book the plumber." : "Declined. Your caretaker has been told.");
    }, 650);
    timers.current.push(id);
  }

  const done = phase === "approved" || phase === "declined";
  const pill = phase === "approved" ? "good" : phase === "declined" ? "bad" : "warn";
  const pillText = phase === "approved" ? "Approved" : phase === "declined" ? "Declined" : "Pending approval";

  return (
    <div className="req-demo" data-reveal="up" id="reqDemo">
      <div className="req-card">
        <div className="photos">
          <div dangerouslySetInnerHTML={{ __html: SCENES["v:sink"] }} />
          <div dangerouslySetInnerHTML={{ __html: SCENES["v:undersink"] }} />
        </div>
        <div className="rc-body">
          <div className="rc-top">
            <span className="mono" style={{ color: "var(--ink-3)" }}>Maintenance request</span>
            <span className={`pill ${pill}`} id="rdPill">{pillText}</span>
          </div>
          <h4>Kitchen faucet leaking</h4>
          <p className="desc">Water leaking underneath the kitchen sink. The cartridge needs replacing.</p>
          <div className="kv">
            <div><span className="mono">Type</span><b>Plumbing</b></div>
            <div><span className="mono">Photos</span><b>2 attached</b></div>
            <div><span className="mono">Estimate</span><b>$85</b></div>
          </div>
          <div className="actions" id="rdActions">
            {phase === "approved" && (
              <div className="btn ok done-state" style={{ flex: 1, justifyContent: "center" }}>
                Approved
                <span className="ic">
                  <svg className="check-draw" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
              </div>
            )}
            {phase === "declined" && (
              <div className="btn ghost done-state" style={{ flex: 1, justifyContent: "center" }}>
                Declined · Your caretaker was notified
              </div>
            )}
            {!done && (
              <>
                <button className="btn" type="button" onClick={() => decide(true)}>
                  {phase === "loading-approve" ? (
                    <span className="spin"></span>
                  ) : (
                    <>
                      Approve
                      <span className="ic">
                        <Icon name="check" />
                      </span>
                    </>
                  )}
                </button>
                <button className="btn ghost" type="button" onClick={() => decide(false)}>
                  {phase === "loading-decline" ? <span className="spin"></span> : "Decline"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <button className="reset" id="rdReset" type="button" hidden={!done} onClick={() => setPhase("idle")}>
        Reset demo
      </button>
    </div>
  );
}