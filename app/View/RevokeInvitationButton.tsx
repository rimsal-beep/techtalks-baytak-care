"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { revokeInvitation } from "@/app/actions/invitation";

export default function RevokeInvitationButton({
  invitationId,
}: {
  invitationId: string;
}) {
  const router = useRouter();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function handleConfirm() {
    // Lock immediately, before React renders the disabled button.
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError("");

    try {
      const result = await revokeInvitation(invitationId);

      if (result.success) {
        router.refresh();
        // Stay disabled until refresh removes the revoked invitation row.
        return;
      }

      setError(result.error);
    } catch {
      setError("Failed to revoke invitation.");
    }

    inFlight.current = false;
    setLoading(false);
  }

  return (
    <div style={{ marginTop: 12 }}>
      {showConfirmation ? (
        <>
          <p>Revoke this invitation? Its link will no longer work.</p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            style={{ color: "#b91c1c" }}
          >
            {loading ? "Revoking..." : "Confirm revoke"}
          </button>{" "}
          <button
            type="button"
            onClick={() => setShowConfirmation(false)}
            disabled={loading}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirmation(true)}
          style={{ color: "#b91c1c" }}
        >
          Revoke
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
