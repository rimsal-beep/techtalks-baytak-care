"use client";

import { FormEvent, useState } from "react";
import { createMaintenanceRequest } from "../../actions/maintenance";
import  {CurrencySelect,EstimateNoteInput,EstimatedCostInput}from"../../Components/CostEstimet/costEstimat";
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
  const [requestType, setRequestType] = useState("Inspection");
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
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-700" />
            <span className="text-xl font-bold text-slate-900">
              Baytak Care
            </span>
          </div>
        </header>

        <section className="mx-auto max-w-3xl py-10">
          <div className="mb-8">
            <p className="mb-2 text-sm font-bold tracking-wide text-blue-700">
              PROPERTY MONITORING
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Submit a Request
            </h1>

            <p className="mt-3 text-lg text-slate-500">
              Report an inspection or maintenance issue for this property.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property */}
            <div>
              <label
                htmlFor="property"
                className="mb-2 block text-base font-semibold text-slate-800"
              >
                Property
              </label>

              <select
                id="property"
                name="propertyId"
                value={property.id}
                disabled
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-4 text-base outline-none"
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
                className="mb-2 block text-base font-semibold text-slate-800"
              >
                Title
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="e.g. Bathroom water leak"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

           {/* Request Type */}
<div>
  <label htmlFor="requestType" className="mb-2 block text-base font-semibold text-slate-800">
    Issue Type
  </label>
  <select
    id="requestType"
    name="requestType"
    required
    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
  >
    <option value="">Select an issue type</option>
    <option value="PLUMBING">Plumbing</option>
    <option value="ELECTRICAL">Electrical</option>
    <option value="HVAC">HVAC / Air conditioning</option>
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
                className="mb-2 block text-base font-semibold text-slate-800"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                required
                rows={4}
                placeholder="Describe the issue..."
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-4 text-base outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Estimate */}
            <div className="grid grid-cols-[1.2fr_0.8fr] gap-2.5">
              <EstimatedCostInput />
              <CurrencySelect />
            </div>

            <EstimateNoteInput />

            {/* Photo */}
            <div>
              <label
                htmlFor="photo"
                className="mb-2 block text-base font-semibold text-slate-800"
              >
                Photo
              </label>

              <label
                htmlFor="photo"
                className="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-base text-slate-400 transition hover:border-blue-500 hover:bg-blue-50"
              >
                Tap to add a photo
              </label>

              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Success message */}








            {submitted && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                Request submitted successfully.
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-blue-800"
              >
                Submit Request
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}