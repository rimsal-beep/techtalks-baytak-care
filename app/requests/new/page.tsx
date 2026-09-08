"use client";

import { FormEvent, useState } from "react";

export default function NewRequestPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-zinc-500">
            Property Monitoring
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
            Submit a Request
          </h1>

          <p className="mt-2 text-zinc-600">
            Report an inspection or maintenance request for your property.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="space-y-6">
            <div>
              <label
                htmlFor="property"
                className="mb-2 block text-sm font-medium text-zinc-900"
              >
                Property
              </label>

              <select
                id="property"
                name="property"
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-zinc-900"
              >
                <option value="">Select a property</option>
                <option value="beirut-apartment">Beirut Apartment</option>
                <option value="mount-lebanon-house">
                  Mount Lebanon House
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="requestType"
                className="mb-2 block text-sm font-medium text-zinc-900"
              >
                Request Type
              </label>

              <select
                id="requestType"
                name="requestType"
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:border-zinc-900"
              >
                <option value="">Select request type</option>
                <option value="inspection">Inspection</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-zinc-900"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                required
                rows={5}
                placeholder="Describe the issue or request..."
                className="w-full resize-none rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-900"
              />
            </div>

            <div>
              <label
                htmlFor="estimatedCost"
                className="mb-2 block text-sm font-medium text-zinc-900"
              >
                Estimated Cost
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  $
                </span>

                <input
                  id="estimatedCost"
                  name="estimatedCost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-lg border border-zinc-300 py-3 pl-8 pr-4 text-zinc-900 outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="photo"
                className="mb-2 block text-sm font-medium text-zinc-900"
              >
                Photo
              </label>

              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-700"
              />
            </div>

            {submitted && (
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
                Request form is ready to be submitted.
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-6 py-3 font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition hover:bg-zinc-700"
              >
                Submit Request
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}