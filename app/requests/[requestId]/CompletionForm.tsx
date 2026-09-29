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

  const [beforePhotoUrls, setBeforePhotoUrls] = useState([""]);
  const [afterPhotoUrls, setAfterPhotoUrls] = useState([""]);
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
    const beforePhotoUrls = formData
      .getAll("beforePhotoUrls")
      .map((url) => String(url).trim())
      .filter(Boolean);
    const afterPhotoUrls = formData
      .getAll("afterPhotoUrls")
      .map((url) => String(url).trim())
      .filter(Boolean);
    const receiptUrl = String(formData.get("receiptUrl") ?? "");

    const result = await completeMaintenanceRequest({
      requestId,
      actualCost,
      beforePhotoUrls,
      afterPhotoUrls,
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

      <div className={detailStyle.photoFields}>
        <div className={detailStyle.formField}>
          <label>Before-photo links</label>
          {beforePhotoUrls.map((_, index) => (
            <div className={detailStyle.photoInputRow} key={`before-${index}`}>
              <input
                aria-label={`Before-photo link ${index + 1}`}
                name="beforePhotoUrls"
                type="url"
                placeholder="https://example.com/before-photo.jpg"
              />
              {beforePhotoUrls.length > 1 && (
                <button
                  type="button"
                  className={detailStyle.photoAction}
                  onClick={() =>
                    setBeforePhotoUrls((urls) =>
                      urls.filter((_, urlIndex) => urlIndex !== index)
                    )
                  }
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className={detailStyle.photoAction}
            onClick={() => setBeforePhotoUrls((urls) => [...urls, ""])}
          >
            Add before-photo
          </button>
        </div>

        <div className={detailStyle.formField}>
          <label>After-photo links</label>
          {afterPhotoUrls.map((_, index) => (
            <div className={detailStyle.photoInputRow} key={`after-${index}`}>
              <input
                aria-label={`After-photo link ${index + 1}`}
                name="afterPhotoUrls"
                type="url"
                placeholder="https://example.com/after-photo.jpg"
              />
              {afterPhotoUrls.length > 1 && (
                <button
                  type="button"
                  className={detailStyle.photoAction}
                  onClick={() =>
                    setAfterPhotoUrls((urls) =>
                      urls.filter((_, urlIndex) => urlIndex !== index)
                    )
                  }
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className={detailStyle.photoAction}
            onClick={() => setAfterPhotoUrls((urls) => [...urls, ""])}
          >
            Add after-photo
          </button>
        </div>
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