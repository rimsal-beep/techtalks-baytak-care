"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { createProperty } from "@/app/actions/property";

type CreatedProperty = {
  id: string;
  address: string;
  city: string | null;
};

export default function PropertyForm() {
  const addressRef = useRef<HTMLInputElement>(null);
  const [createdProperty, setCreatedProperty] =
    useState<CreatedProperty | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await createProperty({
        address: String(formData.get("address") ?? ""),
        city: String(formData.get("city") ?? ""),
      });

      if (!response.success) {
        setError(response.error);
        return;
      }

      setCreatedProperty(response.data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function addAnotherProperty() {
    setCreatedProperty(null);
    setError("");
    requestAnimationFrame(() => addressRef.current?.focus());
  }

  if (createdProperty) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          Property added successfully
        </h2>
        <p className="mt-2 text-slate-600">
          {createdProperty.address}
          {createdProperty.city ? `, ${createdProperty.city}` : ""}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={addAnotherProperty}
            className="rounded-xl border border-blue-700 bg-white px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            Add another property
          </button>
          <Link
            href="/"
            className="rounded-xl bg-blue-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-800"
          >
            Continue to dashboard
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div>
        <label
          htmlFor="address"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Address
        </label>
        <input
          ref={addressRef}
          id="address"
          name="address"
          type="text"
          required
          autoComplete="street-address"
          placeholder="Building, street, and area"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label
          htmlFor="city"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          City <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="city"
          name="city"
          type="text"
          autoComplete="address-level2"
          placeholder="e.g. Beirut"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {isSubmitting ? "Adding property…" : "Add property"}
      </button>
    </form>
  );
}
