"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "../../Caretaker.module.css";
import d from "../../RequestDetail.module.css";
import { Icon } from "../../parts";
import PhotoGrid, { Thumb } from "../../PhotoGrid";
import { money } from "../../format";
import { completeJob, uploadJobFile } from "@/app/actions/job";

type Item = { url: string; file?: File };
type Kind = "before" | "after" | "receipt";

const MAX = 5 * 1024 * 1024;

function DiffChip({ diff, currency }: { diff: number; currency: string }) {
  if (Math.abs(diff) < 0.005)
    return (
      <span className={`${d.dchip} ${d.dok}`}>
        <Icon name="check" />
        Matches the estimate
      </span>
    );
  return diff > 0 ? (
    <span className={`${d.dchip} ${d.dwait}`}>{money(diff, currency)} over estimate</span>
  ) : (
    <span className={`${d.dchip} ${d.dok}`}>{money(-diff, currency)} under estimate</span>
  );
}

export default function JobForm({
  requestId,
  estimate,
  currency,
  ownerFirst,
}: {
  requestId: string;
  estimate: number | null;
  currency: string;
  ownerFirst: string;
}) {
  const router = useRouter();
  const [actual, setActual] = useState("");
  const [before, setBefore] = useState<Item[]>([]);
  const [after, setAfter] = useState<Item[]>([]);
  const [receipt, setReceipt] = useState<Item | null>(null);
  const [tried, setTried] = useState(false);
  const [linkFor, setLinkFor] = useState<Kind | null>(null);
  const [linkText, setLinkText] = useState("");
  const [linkBad, setLinkBad] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState<Kind | null>(null);

  const cost = Number(actual);
  const hasCost = actual.trim() !== "" && Number.isFinite(cost) && cost >= 0;
  const ok = { cost: hasCost, before: before.length > 0, after: after.length > 0, receipt: !!receipt };
  const photosReady = ok.before && ok.after;
  const ready = [ok.cost, photosReady, ok.receipt].filter(Boolean).length;
  const canSubmit = ok.cost && ok.after && ok.receipt;

  function addFiles(kind: Kind, files: FileList | File[]) {
    const list = Array.from(files);
    const added: Item[] = [];
    for (const f of list) {
      const pdfOk = kind === "receipt" && f.type === "application/pdf";
      if (!(f.type.startsWith("image/") || pdfOk)) {
        setNote(kind === "receipt" ? "Use a photo or a PDF." : "Use a photo (JPG, PNG, WebP).");
        continue;
      }
      if (f.size > MAX) {
        setNote("Each file must be smaller than 5 MB.");
        continue;
      }
      const url = URL.createObjectURL(f);
      added.push({ url, file: f });
    }
    if (!added.length) return;
    setNote(null);
    if (kind === "receipt") setReceipt(added[0]);
    else if (kind === "before") setBefore((p) => [...p, ...added].slice(0, 10));
    else setAfter((p) => [...p, ...added].slice(0, 10));
  }

  function addLink(kind: Kind) {
    const v = linkText.trim();
    if (!/^https?:\/\/\S+\.\S+/i.test(v)) {
      setLinkBad(true);
      return;
    }
    const item = { url: v };
    if (kind === "receipt") setReceipt(item);
    else if (kind === "before") setBefore((p) => [...p, item].slice(0, 10));
    else setAfter((p) => [...p, item].slice(0, 10));
    setLinkFor(null);
    setLinkText("");
    setLinkBad(false);
  }

  function onDrop(kind: Kind, e: DragEvent) {
    e.preventDefault();
    setOver(null);
    addFiles(kind, e.dataTransfer.files);
  }

  function tryFinish() {
    setTried(true);
    if (canSubmit) {
      setError(null);
      setConfirming(true);
      return;
    }
    const first = !ok.cost ? "step1" : !ok.after ? "step2" : "step3";
    document.getElementById(first)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const push = async (it: Item, kind: "photo" | "receipt") => {
        if (!it.file) return it.url;
        const fd = new FormData();
        fd.append("file", it.file);
        fd.append("kind", kind);
        const r = await uploadJobFile(fd);
        if (!r.success) throw new Error(r.error);
        return r.url;
      };
      const beforeUrls: string[] = [];
      for (const it of before) beforeUrls.push(await push(it, "photo"));
      const afterUrls: string[] = [];
      for (const it of after) afterUrls.push(await push(it, "photo"));
      const receiptUrl = await push(receipt as Item, "receipt");

      const res = await completeJob({
        requestId,
        actualCost: cost,
        beforePhotoUrls: beforeUrls,
        afterPhotoUrls: afterUrls,
        receiptUrl,
      });
      if (!res.success) throw new Error(res.error);
      setConfirming(false);
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  const cmp =
    estimate !== null ? (
      hasCost ? <DiffChip diff={cost - estimate} currency={currency} /> : `Estimate was ${money(estimate, currency)}.`
    ) : (
      "This request had no estimate."
    );

  function adder(kind: Kind, label: string, accept: string, multiple: boolean) {
    return (
      <div className={d.adder}>
        <label
          className={`${d.addtile} ${over === kind ? d.over : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(kind);
          }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => onDrop(kind, e)}
        >
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            aria-label={label}
            onChange={(e) => {
              if (e.target.files) addFiles(kind, e.target.files);
              e.target.value = "";
            }}
          />
          <span>
            <Icon name={kind === "receipt" ? "file" : "camera"} />
            <b>{label}</b>
            <small>Drag here or tap to {kind === "receipt" ? "upload" : "take / upload"}</small>
          </span>
        </label>
        {linkFor === kind ? (
          <div className={d.linkrow}>
            <input
              type="url"
              value={linkText}
              className={linkBad ? d.bad : ""}
              onChange={(e) => {
                setLinkText(e.target.value);
                setLinkBad(false);
              }}
              placeholder="Paste a link, e.g. https://…"
              aria-label={`Link for ${label}`}
            />
            <button type="button" className={`${styles.btn} ${d.sm}`} onClick={() => addLink(kind)}>
              Add
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnLight} ${d.sm}`} onClick={() => setLinkFor(null)}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={d.linkbtn}
            onClick={() => {
              setLinkFor(kind);
              setLinkText("");
              setLinkBad(false);
            }}
          >
            <Icon name="link" />
            Add by link instead
          </button>
        )}
      </div>
    );
  }

  function step(n: number, done: boolean, title: string, sub: string, err: string | false, children: ReactNode) {
    const bad = tried && !!err;
    return (
      <li key={n} className={`${d.jstep} ${done ? d.done : ""} ${bad ? d.bad : ""}`} id={`step${n}`}>
        <span className={d.jn}>{done ? <Icon name="check" /> : n}</span>
        <div className={d.jb}>
          <h3>{title}</h3>
          <p className={d.jsub}>{sub}</p>
          {children}
          {bad && (
            <p className={d.jerr}>
              <Icon name="alert" />
              {err}
            </p>
          )}
        </div>
      </li>
    );
  }

  const row = (isOk: boolean, label: string, value: string, warn = false) => (
    <div className={`${d.rv} ${isOk ? d.rvOk : warn ? d.rvWarn : d.rvMiss}`}>
      <span className={d.rvi}>
        <Icon name={isOk ? "check" : warn ? "alert" : "x"} />
      </span>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );

  return (
    <section className={`${d.job} ${styles.rise}`} style={{ "--i": 5 } as React.CSSProperties} id="job">
      <header className={d.jh}>
        <div>
          <span className={styles.mono}>Your action</span>
          <h2>Complete the job</h2>
          <p>Four short steps. {ownerFirst} sees everything once you submit.</p>
        </div>
        <div className={d.jprog} aria-label={`${ready} of 3 steps ready`}>
          <span>{ready}/3</span>
          <i style={{ "--p": ready / 3 } as React.CSSProperties} />
        </div>
      </header>

      <ol className={d.jsteps}>
        {step(
          1,
          ok.cost,
          "Final cost",
          "Enter the amount you actually paid for this repair.",
          !ok.cost && "Enter the final cost, even if it matches the estimate.",
          <div className={d.mrow}>
            <div className={d.money}>
              <span>{currency === "LBP" ? "LBP" : "$"}</span>
              <input
                id="actual"
                inputMode="decimal"
                placeholder="0.00"
                value={actual}
                onChange={(e) => setActual(e.target.value.replace(/[^0-9.]/g, ""))}
                aria-label="Final cost"
              />
            </div>
            <div className={d.mcmp}>{cmp}</div>
          </div>,
        )}

        {step(
          2,
          photosReady,
          "Before & after photos",
          "Show the problem before you started and the result after the repair.",
          !ok.after
            ? "Add at least one photo of the finished work."
            : !ok.before
              ? "A before photo is missing. You can still continue, but it helps the owner compare."
              : false,
          <>
            <div className={d.ba2}>
              <div className={d.bacol}>
                <div className={d.bah}>
                  <b>Before</b>
                  <span>{before.length ? `${before.length} added` : "Recommended"}</span>
                </div>
                <PhotoGrid urls={before.map((i) => i.url)} onRemove={(i) => setBefore((p) => p.filter((_, k) => k !== i))} />
                {adder("before", "Add before photo", "image/*", true)}
              </div>
              <div className={d.bacol}>
                <div className={d.bah}>
                  <b>After</b>
                  <span className={tried && !ok.after ? d.req : ""}>{after.length ? `${after.length} added` : "Required"}</span>
                </div>
                <PhotoGrid urls={after.map((i) => i.url)} onRemove={(i) => setAfter((p) => p.filter((_, k) => k !== i))} />
                {adder("after", "Add after photo", "image/*", true)}
              </div>
            </div>
            {note && (
              <p className={d.jerrAlways}>
                <Icon name="alert" />
                {note}
              </p>
            )}
          </>,
        )}

        {step(
          3,
          ok.receipt,
          "Receipt",
          "Upload the receipt or invoice for what you paid.",
          !ok.receipt && "Add the receipt so the owner can see what was paid.",
          receipt ? (
            <div className={d.rcpt}>
              <span className={d.rthumb}>
                <Thumb url={receipt.url} />
              </span>
              <div>
                <b>{receipt.file ? receipt.file.name : receipt.url}</b>
                <span>{receipt.file ? "Ready to send" : "Link"}</span>
              </div>
              <button type="button" className={`${styles.btn} ${styles.btnLight} ${d.sm}`} onClick={() => setReceipt(null)}>
                Remove
              </button>
            </div>
          ) : (
            adder("receipt", "Upload receipt", "image/*,application/pdf", false)
          ),
        )}

        {step(
          4,
          false,
          "Review & complete",
          "Check the summary, then mark the job as complete.",
          false,
          <>
            <div className={d.review}>
              <div className={d.rvsum}>
                <div>
                  <span className={styles.mono}>Estimated</span>
                  <b>{estimate !== null ? money(estimate, currency) : "—"}</b>
                </div>
                <span className={d.rvarrow}>
                  <Icon name="arrow" />
                </span>
                <div>
                  <span className={styles.mono}>Final</span>
                  <b>{hasCost ? money(cost, currency) : "—"}</b>
                </div>
                {estimate !== null && hasCost && (
                  <div className={d.rvdiff}>
                    <DiffChip diff={cost - estimate} currency={currency} />
                  </div>
                )}
              </div>
              {row(ok.cost, "Final cost", ok.cost ? money(cost, currency) : "Missing")}
              {row(ok.before, "Before photos", ok.before ? String(before.length) : "None", true)}
              {row(ok.after, "After photos", ok.after ? String(after.length) : "Missing")}
              {row(ok.receipt, "Receipt", ok.receipt ? "Attached" : "Missing")}
            </div>
            <button type="button" className={`${styles.btn} ${styles.btnLg} ${d.finish}`} onClick={tryFinish}>
              <Icon name="check" />
              Mark job as complete
            </button>
            <p className={d.fine}>{ownerFirst} will be notified. You can’t edit the job after completing it.</p>
          </>,
        )}
      </ol>

      {confirming && (
        <div className={d.confirm} onClick={() => !busy && setConfirming(false)}>
          <div className={d.cfin} role="dialog" aria-modal="true" aria-labelledby="cfT" onClick={(e) => e.stopPropagation()}>
            <span className={d.cfi}>
              <Icon name="check" />
            </span>
            <h3 id="cfT">Mark this job as complete?</h3>
            <div className={d.cfrows}>
              <div>
                <span>Final cost</span>
                <b>{money(cost, currency)}</b>
              </div>
              <div>
                <span>Photos</span>
                <b>
                  {before.length} before · {after.length} after
                </b>
              </div>
              <div>
                <span>Receipt</span>
                <b>Attached</b>
              </div>
            </div>
            <p className={d.fine}>{ownerFirst} will be notified and the request will close. You can’t edit it afterwards.</p>
            {error && (
              <p className={d.jerrAlways} role="alert">
                <Icon name="alert" />
                {error}
              </p>
            )}
            <div className={d.cfa}>
              <button type="button" className={`${styles.btn} ${styles.btnLight}`} disabled={busy} onClick={() => setConfirming(false)}>
                Go back
              </button>
              <button type="button" className={styles.btn} disabled={busy} onClick={submit} autoFocus>
                {busy ? (
                  <>
                    <span className={d.spin} />
                    Completing…
                  </>
                ) : (
                  "Yes, complete job"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
