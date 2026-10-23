"use client";
import BrandMark from "@/app/Components/BrandMark";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createMaintenanceRequest } from "../../actions/maintenance";
import { shrinkImage } from "@/lib/shrinkImage";
import {
  CurrencySelect,
  EstimateNoteInput,
  EstimatedCostInput,
  PhotoUrl,
} from "../../Components/CostEstimet/costEstimat";

type Property = {
  id: string;
  address: string;
  city: string | null;
};

type NewRequestFormProps = {
  property: Property;
};

export default function NewRequestForm({
  property,
}: NewRequestFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [keyReady, setKeyReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const storageKey = `baytak-care:create-request:${property.id}`;

  useEffect(() => {
    let key: string | null = null;

    try {
      key = window.sessionStorage.getItem(storageKey);
    } catch {
      // Continue with an in-memory key if storage is unavailable.
    }

    if (
      !key ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key
      )
    ) {
      key = window.crypto.randomUUID();

      try {
        window.sessionStorage.setItem(storageKey, key);
      } catch {
        // Continue with the in-memory key.
      }
    }
    /* eslint-disable react-hooks/set-state-in-effect -- the key is read from sessionStorage in the browser, so it must be set after mount */
    setIdempotencyKey(key);
    setKeyReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [storageKey]);

  function resetForAnotherRequest() {
    const newKey = window.crypto.randomUUID();

    try {
      window.sessionStorage.setItem(storageKey, newKey);
    } catch {
      // Continue with the in-memory key.
    }

    formRef.current?.reset();
    setIdempotencyKey(newKey);
    setSubmitted(false);
    setPending(false);
    setError("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!keyReady || !idempotencyKey || pending || submitted) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    setPending(true);
    setError("");
    setSuccessMessage("");

    try {
            const rawPhotos = formData
        .getAll("issuePhotoUrls")
        .filter((value): value is File => value instanceof File);
      const issuePhotos = await Promise.all(rawPhotos.map(shrinkImage));

      if (issuePhotos.some((photo) => photo.size > 5 * 1024 * 1024)) {
        setError("Each photo must be smaller than 5 MB.");
        return;
      }
      const response = await createMaintenanceRequest({
        title: formData.get("title") as string,
        requestType: formData.get("requestType") as string,
        description: formData.get("description") as string,
        estimatedCost: formData.get("estimatedCost")
          ? Number(formData.get("estimatedCost"))
          : undefined,
        currency: formData.get("currency") as "USD" | "LBP",
        estimateNote: formData.get("estimateNote") as string,
               issuePhotos,
        propertyId: property.id,
        idempotencyKey,
      });

      if (response.success) {
        setSubmitted(true);
        setSuccessMessage(
          response.duplicate
            ? "This request was already submitted. No duplicate was created."
            : "Request submitted successfully."
        );
      } else {
        setError(
          response.error ?? "Request submission failed. Please try again."
        );
      }
    } catch {
      // Preserve the same key so retries after a timeout remain safe.
      setError(
        "The submission could not be confirmed. Please try again."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F6F3] text-[#181A1B]">
      <div className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
        <header className="border-b border-[#E4E1D9] pb-6">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BrandMark size={28} />
            <span style={{ fontSize: 17, fontWeight: 600, color: "#14213D" }}>
              Baytak Care
            </span>
          </div>
        </header>

        <section className="mx-auto max-w-3xl py-10">
          <div className="mb-8">
            <p className="mb-2 text-[13px] font-semibold tracking-wide text-[#1F4E79]">
              PROPERTY MONITORING
            </p>

            <h1
              className="text-[32px] leading-tight text-[#181A1B]"
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontWeight: 500,
              }}
            >
              Submit a request
            </h1>

            <p className="mt-3 text-[15px] text-[#8B8D89]">
              Report an inspection or maintenance issue for this property.
            </p>
          </div>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="property"
                className="mb-1.5 block text-[13px] font-semibold text-[#5B5D5A]"
              >
                Property
              </label>

              <select
                id="property"
                name="propertyId"
                value={property.id}
                disabled
                className="w-full rounded-lg border border-[#E4E1D9] bg-[#F1EFEA] px-3.5 py-3 text-sm text-[#5B5D5A] outline-none"
              >
                <option value={property.id}>
                  {property.address}
                  {property.city ? `, ${property.city}` : ""}
                </option>
              </select>

              <input
                type="hidden"
                name="propertyId"
                value={property.id}
              />
            </div>

            <div>
              <label
                htmlFor="title"
                className="mb-1.5 block text-[13px] font-semibold text-[#5B5D5A]"
              >
                Title
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                disabled={pending || submitted}
                placeholder="e.g. Bathroom water leak"
                className="w-full rounded-lg border border-[#E4E1D9] bg-white px-3.5 py-3 text-sm text-[#181A1B] outline-none transition placeholder:text-[#8B8D89] focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15"
              />
            </div>

            <div>
              <label
                htmlFor="requestType"
                className="mb-1.5 block text-[13px] font-semibold text-[#5B5D5A]"
              >
                Issue type
              </label>

              <select
                id="requestType"
                name="requestType"
                required
                disabled={pending || submitted}
                className="w-full rounded-lg border border-[#E4E1D9] bg-white px-3.5 py-3 text-sm text-[#181A1B] outline-none transition focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15"
              >
                <option value="">Select an issue type</option>
                <option value="PLUMBING">Plumbing</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="HVAC">HVAC / air conditioning</option>
                <option value="STRUCTURAL">Structural</option>
                <option value="APPLIANCE">Appliance</option>
                <option value="PAINTING">Painting</option>
                <option value="CLEANING">Cleaning</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-[13px] font-semibold text-[#5B5D5A]"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                required
                rows={4}
                disabled={pending || submitted}
                placeholder="Describe the issue..."
                className="w-full resize-none rounded-lg border border-[#E4E1D9] bg-white px-3.5 py-3 text-sm text-[#181A1B] outline-none transition placeholder:text-[#8B8D89] focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15"
              />
            </div>

            <fieldset
              disabled={pending || submitted}
              className="min-w-0 border-0 p-0"
            >
              <div className="grid grid-cols-[1.2fr_0.8fr] gap-2.5">
                <EstimatedCostInput />
                <CurrencySelect />
              </div>

              <EstimateNoteInput />
            </fieldset>

            <fieldset
              disabled={pending || submitted}
              className="min-w-0 border-0 p-0"
            >
              <PhotoUrl />
            </fieldset>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {submitted && (
              <div
                role="status"
                className="rounded-lg border border-[#C8E6D2] bg-[#E7F4EC] px-4 py-3 text-sm font-medium text-[#1E8E5A]"
              >
                {successMessage}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
              {submitted ? (
                <button
                  type="button"
                  onClick={resetForAnotherRequest}
                  className="rounded-lg bg-[#1F4E79] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Submit another request
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={resetForAnotherRequest}
                    disabled={pending || !keyReady}
                    className="rounded-lg border border-[#E4E1D9] bg-white px-6 py-3 text-sm font-semibold text-[#5B5D5A] transition hover:bg-[#F1EFEA] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Clear form
                  </button>

                  <button
                    type="submit"
                    disabled={!keyReady || pending || !idempotencyKey}
                    className="rounded-lg bg-[#1F4E79] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? "Submitting..." : "Submit request"}
                  </button>
                </>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}