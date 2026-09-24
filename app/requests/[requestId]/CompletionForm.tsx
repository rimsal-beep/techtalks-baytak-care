"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { completeMaintenanceRequest } from "@/app/actions/maintenance";
import detailStyle from "./RequestDetail.module.css";

type CompletionFormProps = {
  requestId: string;
};

export default function CompletionForm({
  requestId,
}: CompletionFormProps) {
  const router = useRouter();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const actualCost = Number(formData.get("actualCost"));
    const beforePhotoUrl = String(formData.get("beforePhotoUrl") ?? "");
    const afterPhotoUrl = String(formData.get("afterPhotoUrl") ?? "");
    const receiptUrl = String(formData.get("receiptUrl") ?? "");

    const result = await completeMaintenanceRequest({
      requestId,
      actualCost,
      beforePhotoUrl,
      afterPhotoUrl,
      receiptUrl,
    });

      if (!result.success) {
     setError(result.error ?? "Failed to complete maintenance request.");
      setLoading(false);
      return;
     }

    setSuccess("Maintenance request completed successfully.");
    setLoading(false);

    router.refresh();
  }

  return (
    <form className={detailStyle.section} onSubmit={handleSubmit}>
      <h3 className={detailStyle.sectionTitle}>Complete the job</h3>

      <p className={detailStyle.formDescription}>
        Add the final cost, links to the completed work, and its receipt.
      </p>

      <div className={detailStyle.formField}>
        <label htmlFor="actual-cost">Actual cost</label>
        <input
          id="actual-cost"
          name="actualCost"
          type="number"
          min="0"
          step="0.01"
          required
          placeholder="0.00"
        />
      </div>

      <div className={detailStyle.formField}>
        <label htmlFor="before-photo-link">Before-photo link</label>
        <input
          id="before-photo-link"
          name="beforePhotoUrl"
          type="url"
          placeholder="https://example.com/before-photo.jpg"
        />
      </div>

      <div className={detailStyle.formField}>
        <label htmlFor="after-photo-link">After-photo link</label>
        <input
          id="after-photo-link"
          name="afterPhotoUrl"
          type="url"
          placeholder="https://example.com/after-photo.jpg"
        />
      </div>

      <div className={detailStyle.formField}>
        <label htmlFor="receipt-link">Receipt link</label>
        <input
          id="receipt-link"
          name="receiptUrl"
          type="url"
          placeholder="https://example.com/receipt.pdf"
        />
      </div>

      {error && <p>{error}</p>}
      {success && <p>{success}</p>}

      <button
        type="submit"
        className={detailStyle.submitButton}
        disabled={loading}
      >
        {loading ? "Completing..." : "Mark as complete"}
      </button>
    </form>
  );
}