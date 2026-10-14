"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProperty } from "@/app/actions/property";
import styles from "./DeletePropertyButton.module.css";

export default function DeletePropertyButton({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function handleConfirm() {
    if (!showConfirmation || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await deleteProperty(propertyId);
      if (result.success) {
        router.replace("/properties");
        router.refresh();
        return;
      }
      setError(result.error);
    } catch {
      setError("Failed to delete property. Please try again.");
    }
    inFlight.current = false;
    setLoading(false);
  }

  return (
    <div className={styles.wrap}>
      {showConfirmation ? (
        <div
          role="group"
          aria-label="Confirm property deletion"
          className={styles.confirm}
        >
          <p className={styles.confirmTitle}>Delete this property?</p>
          <p className={styles.confirmText}>
            This property will be removed from your active properties. The
            caretaker will be unassigned, pending invitations will be
            cancelled, and existing history will be kept.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={styles.danger}
            >
              {loading ? "Deleting..." : "Delete property"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirmation(false);
                setError("");
              }}
              disabled={loading}
              className={styles.cancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirmation(true)}
          className={styles.trigger}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            width="16"
            height="16"
            aria-hidden="true"
          >
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
          </svg>
          Delete property
        </button>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}