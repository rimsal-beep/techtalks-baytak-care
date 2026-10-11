"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProperty } from "@/app/actions/property";

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
    <div className="my-4 rounded-lg border border-red-200 p-4">
      {showConfirmation ? (
        <div role="group" aria-label="Confirm property deletion">
          <p className="mb-3">Delete this property? This property will be removed from your active properties. The caretaker will be unassigned, pending invitations will be cancelled, and existing history will be kept.</p>
          <button type="button" onClick={handleConfirm} disabled={loading} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50">
            {loading ? "Deleting..." : "Delete property"}
          </button>{" "}
          <button type="button" onClick={() => { setShowConfirmation(false); setError(""); }} disabled={loading} className="rounded border px-4 py-2 disabled:opacity-50">Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowConfirmation(true)} className="text-red-700">Delete property</button>
      )}
      {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
    </div>
  );
}
