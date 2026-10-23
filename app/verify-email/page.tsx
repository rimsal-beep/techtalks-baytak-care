"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "../actions/emailVerification";
import AuthShell from "../Components/AuthShell";
import f from "../Components/AuthShell.module.css";
import v from "./VerifyEmail.module.css";

// Must match the `fill` animation duration in VerifyEmail.module.css (2.5s).
const REDIRECT_MS = 2500;

type Outcome = { ok: true } | { ok: false; error: string } | null;

function VerifyEmailContent() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const nextParam = searchParams.get("next");

  const nextPath =
    nextParam && /^\/invite\/[a-f0-9]{64}$/.test(nextParam)
      ? nextParam
      : null;

  const loginUrl = nextPath
    ? `/login?verified=1&next=${encodeURIComponent(nextPath)}`
    : "/login?verified=1";

  const [outcome, setOutcome] = useState<Outcome>(null);

  useEffect(() => {
    if (!token) return;

    const currentToken = token;
    let cancelled = false;

    async function verify() {
      try {
        const result = await verifyEmail(currentToken);

        if (cancelled) return;

        setOutcome(
          result.success
            ? { ok: true }
            : { ok: false, error: result.error },
        );
      } catch {
        if (!cancelled) {
          setOutcome({
            ok: false,
            error: "Unable to verify your email right now. Please try again.",
          });
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const success = outcome?.ok === true;

  // After a success screen, continue to login automatically.
  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      window.location.assign(loginUrl);
    }, REDIRECT_MS);

    return () => clearTimeout(timer);
  }, [success, loginUrl]);

  const errorMessage = !token
    ? "This verification link is invalid or has expired."
    : outcome && !outcome.ok
      ? outcome.error
      : "";

  return (
    <AuthShell>
      {success ? (
        <>
          <div className={v.successCircle} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h1 className={f.title}>Email verified</h1>
          <p className={f.sub} role="status">
            Your account is ready. Taking you to log in...
          </p>
          <div className={v.progress} aria-hidden="true">
            <span />
          </div>
          <div className={f.actions}>
            <Link href={loginUrl} className={f.btnPrimary}>
              Continue to log in
            </Link>
          </div>
        </>
      ) : errorMessage ? (
        <>
          <h1 className={f.title}>We couldn&apos;t verify your email</h1>
          <p className={f.sub}>
            The link may have expired or already been used. You can request a
            new one in a few seconds.
          </p>
          <div className={f.error} role="alert">
            {errorMessage}
          </div>
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