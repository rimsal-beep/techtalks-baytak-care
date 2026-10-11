"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelRequest } from "@/app/actions/request";
import styles from "./RequestDetail.module.css";

export default function OwnerRequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inFlight = useRef(false);
  const id = useId();
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  function closeConfirmation() {
    if (inFlight.current) return;
    dialogRef.current?.close();
    setError("");
  }

  async function confirmCancellation() {
    if (inFlight.current || completed) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await cancelRequest(requestId);
      if (result.success) {
        setCompleted(true);
        dialogRef.current?.close();
        router.refresh();
      } else setError(result.error);
    } catch {
      setError("Could not cancel the request. Try again.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <section className={styles.section} aria-label="Edit or cancel request">
      {completed ? <p role="status">Request cancelled.</p> : (
        <div className={styles.ownerActions}>
          <Link href={"/requests/" + requestId + "/edit"} className={styles.photoAction}>Edit request</Link>
          <button type="button" className={styles.cancelButton} disabled={loading}
            onClick={() => { setError(""); dialogRef.current?.showModal(); }}>
            Cancel request
          </button>
        </div>
      )}
      <dialog ref={dialogRef} className={styles.rejectionDialog}
        aria-labelledby={id + "-title"} aria-describedby={id + "-description"}
        onCancel={(event) => { event.preventDefault(); closeConfirmation(); }}>
        <h3 id={id + "-title"} className={styles.sectionTitle}>Cancel this request?</h3>
        <p id={id + "-description"} className={styles.formDescription}>
          This will stop the request. Its details and history will be kept.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className={styles.ownerActions}>
          <button type="button" className={styles.photoAction} disabled={loading} onClick={closeConfirmation} autoFocus>Cancel</button>
          <button type="button" className={styles.cancelButton} disabled={loading || completed} onClick={confirmCancellation}>
            {loading ? "Cancelling..." : "Confirm cancellation"}
          </button>
        </div>
      </dialog>
    </section>
  );
}
