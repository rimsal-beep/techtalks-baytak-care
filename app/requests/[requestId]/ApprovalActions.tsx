"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { approveRequest, rejectRequest } from "@/app/actions/approval";
import { REJECTION_REASON_MAX_LENGTH } from "@/lib/rejectionReason";
import styles from "./RequestDetail.module.css";

type ApprovalActionsProps = {
  requestId: string;
};

export default function ApprovalActions({ requestId }: ApprovalActionsProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);
  const id = useId();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function handleApprove() {
    if (submittingRef.current || completed) return;

    submittingRef.current = true;
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await approveRequest(requestId);

      if (result.success) {
        setMessage("Request approved successfully.");
        setCompleted(true);
        setTimeout(() => router.refresh(), 1000);
      } else {
        setError(result.error ?? "Failed to approve request.");
      }
    } catch {
      setError("Failed to approve request. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  function openRejectDialog() {
    if (submittingRef.current || completed) return;

    setReason("");
    setError("");
    setMessage("");
    setDialogOpen(true);
    dialogRef.current?.showModal();
    reasonRef.current?.focus();
  }

  function closeRejectDialog() {
    if (submittingRef.current) return;

    dialogRef.current?.close();
    setDialogOpen(false);
    setReason("");
    setError("");
  }

  async function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || completed) return;

    const rejectionReason = reason.trim();

    if (!rejectionReason) {
      setError("Rejection reason is required.");
      reasonRef.current?.focus();
      return;
    }

    if (rejectionReason.length > REJECTION_REASON_MAX_LENGTH) {
      setError(`Rejection reason must be ${REJECTION_REASON_MAX_LENGTH} characters or fewer.`);
      reasonRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await rejectRequest(requestId, rejectionReason);

      if (result.success) {
        dialogRef.current?.close();
        setDialogOpen(false);
        setMessage("Request rejected successfully.");
        setCompleted(true);
        setTimeout(() => router.refresh(), 1000);
      } else {
        setError(result.error ?? "Failed to reject request.");
      }
    } catch {
      setError("Failed to reject request. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

   return (
    <section className={styles.approvalBox}>
      {!completed && (
        <div className={styles.approvalRow}>
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            className={styles.approveBtn}
          >
            {loading ? "Processing..." : "Approve"}
          </button>

          <button
            type="button"
            onClick={openRejectDialog}
            disabled={loading}
            className={styles.rejectBtn}
          >
            {loading ? "Processing..." : "Reject"}
          </button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className={styles.rejectionDialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;

          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            "textarea:not(:disabled), button:not(:disabled)"
          );
          const first = controls[0];
          const last = controls[controls.length - 1];

          if (!first) {
            event.preventDefault();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          closeRejectDialog();
        }}
      >
        <form onSubmit={handleReject} noValidate aria-busy={loading}>
          <h3 id={`${id}-title`} className={styles.sectionTitle}>Reject request</h3>
          <p id={`${id}-description`} className={styles.formDescription}>
            Explain why you are rejecting this request. The caretaker will see this reason.
          </p>

          <div className={styles.formField}>
            <label htmlFor={`${id}-reason`}>Rejection reason (required)</label>
            <textarea
              ref={reasonRef}
              id={`${id}-reason`}
              required
              maxLength={REJECTION_REASON_MAX_LENGTH}
              rows={5}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError("");
              }}
              disabled={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={`${id}-counter${error ? ` ${id}-error` : ""}`}
            />
            <p id={`${id}-counter`} className={styles.muted} aria-live="polite" aria-atomic="true">
              {reason.length} / {REJECTION_REASON_MAX_LENGTH} characters
            </p>
          </div>

          {error && (
            <p id={`${id}-error`} role="alert" className={styles.errorBox}>
              {error}
            </p>
          )}

          <div className={styles.dialogActions}>
            <button
              type="button"
              onClick={closeRejectDialog}
              disabled={loading}
              className={styles.dialogCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={styles.rejectSubmit}
            >
              {loading ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </form>
      </dialog>

      {message && (
        <div role="status" className={styles.successBox}>
          {message}
        </div>
      )}

      {error && !dialogOpen && (
        <div role="alert" className={styles.errorBox}>
          {error}
        </div>
      )}
    </section>
  );
}