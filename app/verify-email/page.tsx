"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "../actions/emailVerification";
import AuthShell from "../Components/AuthShell";
import f from "../Components/AuthShell.module.css";

function VerifyEmailContent() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const nextParam = searchParams.get("next");

  const nextPath =
    nextParam && /^\/invite\/[a-f0-9]{64}$/.test(nextParam)
      ? nextParam
      : null;

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) {
        setError("This verification link is invalid or has expired.");
        return;
      }

      try {
        const result = await verifyEmail(token);

        if (cancelled) return;

        if (result.success) {
                  window.location.href = nextPath
            ? `/login?next=${encodeURIComponent(nextPath)}`
            : "/login";
          return;
        }

        setError(result.error);
      } catch {
        if (!cancelled) {
          setError("Unable to verify your email right now. Please try again.");
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token, nextPath]);

  return (
    <AuthShell>
      {error ? (
        <>
          <h1 className={f.title}>We couldn&apos;t verify your email</h1>
          <p className={f.sub}>
            The link may have expired or already been used.
          </p>
          <div className={f.error} role="alert">{error}</div>
          <div className={f.actions}>
            <Link href="/verify-email/sent" className={f.btnPrimary}>
              Send a new verification email
            </Link>
            <Link href="/login" className={f.secondary}>
              Back to login
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className={f.spinner} aria-hidden="true" />
          <h1 className={f.title}>Verifying your email</h1>
          <p className={f.sub} role="status">
            One moment, we are confirming your email address.
          </p>
        </>
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className={f.sub}>Loading...</p>
        </AuthShell>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}