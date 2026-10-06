"use client";

import { useState } from "react";
import { CHECKLIST_ITEMS } from "@/lib/checklistItems";
import { completeChecklistItem } from "@/app/actions/maintenance";
import style from "./CaretakerDashboard.module.css";

type ChecklistProps = {
  propertyId: string;
  initialCompletedItems: string[];
};

export default function Checklist({
  propertyId,
  initialCompletedItems,
}: ChecklistProps) {
  const [completedItems, setCompletedItems] =
    useState<string[]>(initialCompletedItems);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleCheck(text: string) {
    setError("");
    setLoadingItem(text);

    const result = await completeChecklistItem({
      propertyId,
      text,
    });

    if (result.success) {
      setCompletedItems((current) => [...current, text]);
    } else {
      setError(result.error ?? "Failed to complete checklist item.");
    }

    setLoadingItem(null);
  }

  return (
    <div className={style.checklist}>
      <h4 className={style.checklistTitle}>Property checklist</h4>

      <div className={style.checklistItems}>
        {CHECKLIST_ITEMS.map((text) => {
          const completed = completedItems.includes(text);
          const loading = loadingItem === text;

          return (
            <label key={text} className={style.checklistItem}>
              <input
                type="checkbox"
                checked={completed}
                disabled={completed || loading}
                onChange={() => handleCheck(text)}
              />

              <span>{text}</span>

              {loading && (
                <small className={style.checklistLoading}>
                  Saving...
                </small>
              )}
            </label>
          );
        })}
      </div>

      {error && <p className={style.checklistError}>{error}</p>}
    </div>
  );
}