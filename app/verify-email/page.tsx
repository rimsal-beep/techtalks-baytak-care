
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { verifyEmail } from "../actions/emailVerification";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [message, setMessage] = useState("Verifying your email...");
  const [success, setSuccess] = useState(false);

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
          setSuccess(true);
          setMessage("Your email has been verified. You can now log in.");
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

      {success && <a href="/login">Go to login</a>}
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