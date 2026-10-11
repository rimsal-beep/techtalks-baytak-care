"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateProperty } from "@/app/actions/property";
import styles from "@/app/properties/new/PropertyForm.module.css";

type Property = {
  id: string;
  address: string;
  city: string | null;
};

export default function EditPropertyForm({ property }: { property: Property }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const propertyPath = `/properties/${property.id}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await updateProperty(property.id, {
        address: String(formData.get("address") ?? ""),
        city: String(formData.get("city") ?? ""),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.replace(propertyPath);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} aria-busy={isSubmitting}>
      <div className={styles.field}>
        <label htmlFor="address" className={styles.label}>Address</label>
        <input
          id="address"
          name="address"
          type="text"
          required
          maxLength={200}
          defaultValue={property.address}
          autoComplete="street-address"
          className={styles.input}
          disabled={isSubmitting}
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
          maxLength={100}
          defaultValue={property.city ?? ""}
          autoComplete="address-level2"
          className={styles.input}
          disabled={isSubmitting}
        />
      </div>

      {error && <div role="alert" className={styles.error}>{error}</div>}

      <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? "Saving…" : "Save changes"}
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => router.push(propertyPath)}
        className={styles.secondaryButton}
      >
        Cancel
      </button>
    </form>
  );
}
