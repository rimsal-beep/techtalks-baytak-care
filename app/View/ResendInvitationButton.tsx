
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resendInvitation } from "@/app/actions/invitation";

export default function ResendInvitationButton({
  propertyId,
  email,
}: {
  propertyId: string;
  email: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleResend() {
    setLoading(true);
    setMessage("");

    try {
      const result = await resendInvitation(propertyId, email);
      setMessage(result.success ? result.message : result.error);

      if (result.success) {
        router.refresh();
      }
    } catch {
      setMessage("Failed to resend invitation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleResend} disabled={loading}>
        {loading ? "Sending..." : "Resend invitation"}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
