"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveRequest, rejectRequest } from "@/app/actions/approval";

type ApprovalActionsProps = {
  requestId: string;
};

export default function ApprovalActions({
  requestId,
}: ApprovalActionsProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  async function handleApprove() {
    setLoading(true);
    setMessage("");
    setError("");

    const result = await approveRequest(requestId);

    if (result.success) {
      setMessage("Request approved successfully.");
      setCompleted(true);

      setTimeout(() => {
        router.refresh();
      }, 1000);
    } else {
      setError(result.error ?? "Failed to approve request.");
      setLoading(false);
    }
  }

  async function handleReject() {
    const reason = window.prompt("Please enter a reason for rejection:");

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      setError("Rejection reason is required.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    const result = await rejectRequest(requestId, reason);

    if (result.success) {
      setMessage("Request rejected successfully.");
      setCompleted(true);

      setTimeout(() => {
        router.refresh();
      }, 1000);
    } else {
      setError(result.error ?? "Failed to reject request.");
      setLoading(false);
    }
  }

  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
      {!completed && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Processing..." : "Approve"}
          </button>

          <button
            type="button"
            onClick={handleReject}
            disabled={loading}
            className="rounded-xl border border-red-300 bg-white px-6 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Processing..." : "Reject"}
          </button>
        </div>
      )}

      {message && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
    </section>
  );
}