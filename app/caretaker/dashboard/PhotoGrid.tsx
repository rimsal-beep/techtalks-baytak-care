"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./Caretaker.module.css";
import d from "./RequestDetail.module.css";
import { Icon } from "./parts";

export const isImageUrl = (u: string) =>
  u.startsWith("blob:") || u.startsWith("data:image") || /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(u);

const hostOf = (u: string) => {
  try {
    return new URL(u, "http://x").hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};
const nameOf = (u: string) => {
  try {
    return decodeURIComponent(new URL(u, "http://x").pathname.split("/").pop() || "") || hostOf(u);
  } catch {
    return u;
  }
};

/** A photo, or a tile for a link / PDF. */
export function Thumb({ url }: { url: string }) {
  if (isImageUrl(url)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" />;
  }
  return (
    <span className={d.ltile}>
      <Icon name={url.endsWith(".pdf") ? "file" : "link"} />
      <b>{nameOf(url)}</b>
      <span>{url.startsWith("/") ? (url.endsWith(".pdf") ? "PDF document" : "File") : hostOf(url)}</span>
    </span>
  );
}

/** Photo grid. Click a photo to open it big (arrows and Esc work). */
export default function PhotoGrid({
  urls,
  big = false,
  onRemove,
}: {
  urls: string[];
  big?: boolean;
  onRemove?: (index: number) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const move = useCallback((by: number) => setOpen((i) => (i === null ? i : (i + by + urls.length) % urls.length)), [urls.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" && urls.length > 1) move(1);
      if (e.key === "ArrowLeft" && urls.length > 1) move(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, move, urls.length]);

  if (urls.length === 0) return null;
  const current = open !== null ? urls[open] : null;

  return (
    <>
      <div className={`${d.phgrid} ${big ? d.phBig : ""}`}>
        {urls.map((u, i) => (
          <div className={d.ph} key={`${u}-${i}`}>
            <button type="button" className={d.phb} onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1}`}>
              <Thumb url={u} />
            </button>
            {onRemove && (
              <button type="button" className={d.phx} onClick={() => onRemove(i)} aria-label={`Remove photo ${i + 1}`}>
                <Icon name="x" />
              </button>
            )}
          </div>
        ))}
      </div>

      {current && (
        <div className={d.lb} role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={close}>
          <div className={d.lbin} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={d.lbx} onClick={close} aria-label="Close">
              <Icon name="x" />
            </button>
            <div className={d.lbimg}>
              {isImageUrl(current) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current} alt="" />
              ) : (
                <div className={d.lblink}>
                  <Icon name={current.endsWith(".pdf") ? "file" : "link"} />
                  <b>{nameOf(current)}</b>
                  <a href={current} target="_blank" rel="noopener noreferrer">
                    Open {current.endsWith(".pdf") ? "file" : "link"}
                    <Icon name="arrow" />
                  </a>
                </div>
              )}
            </div>
            {urls.length > 1 && (
              <>
                <button type="button" className={`${d.lbn} ${d.lbPrev}`} onClick={() => move(-1)} aria-label="Previous">
                  <Icon name="arrowL" />
                </button>
                <button type="button" className={`${d.lbn} ${d.lbNext}`} onClick={() => move(1)} aria-label="Next">
                  <Icon name="arrow" />
                </button>
              </>
            )}
            <span className={`${d.lbc} ${styles.mono}`}>
              {(open ?? 0) + 1} / {urls.length}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
