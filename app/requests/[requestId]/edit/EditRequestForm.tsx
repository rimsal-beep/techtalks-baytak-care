"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { editRequest } from "@/app/actions/request";
import { REQUEST_TYPES } from "@/lib/maintenanceRequestFields";
import styles from "../RequestDetail.module.css";

type EditableRequest = {
  id: string; title: string; description: string; requestType: string;
  estimatedCost: string; currency: "USD" | "LBP"; estimateNote: string;
};

export default function EditRequestForm({ request }: { request: EditableRequest }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || saved) return;
    const form = new FormData(event.currentTarget);
    inFlight.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await editRequest(request.id, {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        requestType: String(form.get("requestType") ?? ""),
        estimatedCost: form.get("estimatedCost") ? Number(form.get("estimatedCost")) : undefined,
        currency: form.get("currency") as "USD" | "LBP",
        estimateNote: String(form.get("estimateNote") ?? ""),
      });
      if (result.success) {
        setSaved(true);
        router.push("/requests/" + request.id);
        router.refresh();
      } else setError(result.error);
    } catch { setError("Could not edit the request. Try again."); }
    finally { inFlight.current = false; setLoading(false); }
  }

  return (
    <form className={styles.section} onSubmit={save} aria-busy={loading}>
      <p className={styles.formDescription}>Update this request while it is pending approval.</p>
      <fieldset disabled={loading || saved} className={styles.editFields}>
        <div className={styles.formField}>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" defaultValue={request.title} required maxLength={120} />
        </div>
        <div className={styles.formField}>
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" defaultValue={request.description} maxLength={2000} rows={4} />
        </div>
        <div className={styles.formField}>
          <label htmlFor="requestType">Issue type</label>
          <select id="requestType" name="requestType" defaultValue={request.requestType} required>
            {REQUEST_TYPES.map(type => <option key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
        <div className={styles.formField}>
          <label htmlFor="estimatedCost">Estimated cost</label>
          <input id="estimatedCost" name="estimatedCost" type="number" min="0" max="99999999.99" step="0.01" required defaultValue={request.estimatedCost} />
        </div>
        <div className={styles.formField}>
          <label htmlFor="currency">Currency</label>
          <select id="currency" name="currency" defaultValue={request.currency} required>
            <option value="USD">USD</option><option value="LBP">LBP</option>
          </select>
        </div>
        <div className={styles.formField}>
          <label htmlFor="estimateNote">Estimate note</label>
          <textarea id="estimateNote" name="estimateNote" defaultValue={request.estimateNote} maxLength={1000} rows={3} />
        </div>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">Request saved.</p>}
      <div className={styles.ownerActions}>
        {loading || saved ? <span className={styles.muted}>Cancel</span> : (
          <Link href={"/requests/" + request.id} className={styles.photoAction}>Cancel</Link>
        )}
        <button type="submit" className={styles.photoAction} disabled={loading || saved}>{loading ? "Saving..." : "Save changes"}</button>
      </div>
    </form>
  );
}
