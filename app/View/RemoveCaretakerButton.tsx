
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeCaretaker } from "@/app/actions/invitation";

export default function RemoveCaretakerButton({
  propertyId,
}: {
  propertyId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRemove() {
    if (!window.confirm("Remove this caretaker from the property?")) return;

    setLoading(true);
    setError("");

    try {
      const result = await removeCaretaker(propertyId);

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to remove caretaker.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRemove}
        disabled={loading}
        style={{ color: "#b91c1c", marginTop: 12 }}
      >
        {loading ? "Removing..." : "Remove caretaker"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
