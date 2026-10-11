
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { verifyEmail } from "../actions/emailVerification";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) {
        setMessage("This verification link is invalid or has expired.");
        return;
      }

      try {
        const result = await verifyEmail(token);

        if (cancelled) return;

        if (result.success) {
  window.location.href = "/profile";
  return;
} else {
          setMessage(result.error);
        }
      } catch {
        if (!cancelled) {
          setMessage("Unable to verify your email right now. Please try again.");
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main style={{ maxWidth: 520, margin: "80px auto", padding: 24 }}>
      <h1>Email verification</h1>
      <p role="status">{message}</p>
    </main>
  );
}
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main>Loading verification page...</main>}>
      <VerifyEmailContent />
    </Suspense>
  );
}