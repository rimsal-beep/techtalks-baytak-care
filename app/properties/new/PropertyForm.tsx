"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { createProperty } from "@/app/actions/property";
import styles from "./PropertyForm.module.css";

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
      <section className={styles.successPanel}>
        <div className={styles.successIcon}>✓</div>
        <h2 className={styles.successTitle}>
          Property added successfully
        </h2>
        <p className={styles.successAddress}>
          {createdProperty.address}
          {createdProperty.city ? `, ${createdProperty.city}` : ""}
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={addAnotherProperty}
            className={styles.secondaryButton}
          >
            Add another property
          </button>
          <Link
            href="/"
            className={styles.primaryLink}
          >
            Continue to dashboard
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="address" className={styles.label}>
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
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="city" className={styles.label}>
          City <span className={styles.optional}>(optional)</span>
        </label>
        <input
          id="city"
          name="city"
          type="text"
          autoComplete="address-level2"
          placeholder="e.g. Beirut"
          className={styles.input}
        />
      </div>

      {error && (
        <div
          role="alert"
          className={styles.error}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={styles.submitButton}
      >
        {isSubmitting ? "Adding property…" : "Add property"}
      </button>
    </form>
  );
}
