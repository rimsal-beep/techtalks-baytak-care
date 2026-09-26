"use client";

import { FormEvent, useState } from "react";
import { createMaintenanceRequest } from "../../actions/maintenance";
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
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const response = await createMaintenanceRequest({
      title: formData.get("title") as string,
      requestType: formData.get("requestType") as string,
      description: formData.get("description") as string,
      estimatedCost: formData.get("estimatedCost")
        ? Number(formData.get("estimatedCost"))
        : undefined,
      currency: formData.get("currency") as "USD" | "LBP",
      estimateNote: formData.get("estimateNote") as string,
      issuePhotos: formData
        .getAll("issuePhotoUrls")
        .filter((value): value is File => value instanceof File),
      propertyId: formData.get("propertyId") as string,
    });

    if (response.success) {
      setSubmitted(true);
    } else {
      setSubmitted(false);
      alert(response.error);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F6F3] text-[#181A1B]">
      <div className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
        <header className="border-b border-[#E4E1D9] pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F4E79] text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
                <path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" />
              </svg>
            </div>
            <span className="text-[17px] font-semibold text-[#181A1B]">
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
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500 }}
            >
              Submit a request
            </h1>

            <p className="mt-3 text-[15px] text-[#8B8D89]">
              Report an inspection or maintenance issue for this property.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Property */}
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

            {/* Title */}
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
                placeholder="e.g. Bathroom water leak"
                className="w-full rounded-lg border border-[#E4E1D9] bg-white px-3.5 py-3 text-sm text-[#181A1B] outline-none transition placeholder:text-[#8B8D89] focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15"
              />
            </div>

           {/* Request Type */}
<div>
  <label htmlFor="requestType" className="mb-1.5 block text-[13px] font-semibold text-[#5B5D5A]">
    Issue type
  </label>
  <select
    id="requestType"
    name="requestType"
    required
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

            {/* Description */}
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
                placeholder="Describe the issue..."
                className="w-full resize-none rounded-lg border border-[#E4E1D9] bg-white px-3.5 py-3 text-sm text-[#181A1B] outline-none transition placeholder:text-[#8B8D89] focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15"
              />
            </div>

            {/* Estimate */}
            <div className="grid grid-cols-[1.2fr_0.8fr] gap-2.5">
              <EstimatedCostInput />
              <CurrencySelect />
            </div>
            <EstimateNoteInput/>

            {/* Photo */}
           <PhotoUrl/>

            {/* Success message */}
            {submitted && (
              <div className="rounded-lg border border-[#C8E6D2] bg-[#E7F4EC] px-4 py-3 text-sm font-medium text-[#1E8E5A]">
                Request submitted successfully.
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="rounded-lg border border-[#E4E1D9] bg-white px-6 py-3 text-sm font-semibold text-[#5B5D5A] transition hover:bg-[#F1EFEA]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-[#1F4E79] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Submit request
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}