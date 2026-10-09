"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startWork } from "@/app/actions/job";
import styles from "../../Caretaker.module.css";
import d from "../../RequestDetail.module.css";
import { Icon } from "../../parts";

export default function StartWorkButton({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    setLoading(true);
    setError("");

    try {
      const result = await startWork(requestId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to start work. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginLeft: "auto", flex: "none" }}>
      <button
        type="button"
        onClick={handleStart}
        disabled={loading}
        className={`${styles.btn} ${d.nbBtn}`}
      >
        {loading ? "Starting..." : "Start work"}
        {!loading && <Icon name="arrowD" />}
      </button>

      {error && (
        <p style={{ marginTop: 8, color: "var(--no)" }}>
          {error}
        </p>
      )}
    </div>
  );
}