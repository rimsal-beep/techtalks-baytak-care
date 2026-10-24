"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "../actions/emailVerification";
import AuthShell from "../Components/AuthShell";
import v from "./VerifyEmail.module.css";

// After the "Email confirmed" screen, go to login by itself after this long.
// The "Log in" button always works right away.
const REDIRECT_MS = 4000;

type Outcome = { ok: true } | { ok: false; error: string } | null;

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

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
          result.success ? { ok: true } : { ok: false, error: result.error },
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
          <div className={`${v.tile} ${v.tileSuccess}`} aria-hidden="true">
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
          <h1 className={v.title}>
            Email <span className={v.accent}>confirmed</span>
          </h1>
          <p className={v.lead} role="status">
            Thanks. Your account is ready. Log in to get started.
          </p>
          <Link href={loginUrl} className={v.primaryBtn}>
            Log in
            <ArrowIcon />
          </Link>
        </>
      ) : errorMessage ? (
        <>
          <div className={`${v.tile} ${v.tileError}`} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 7v6M12 17h.01" />
            </svg>
          </div>
          <h1 className={v.title}>
            We couldn&apos;t <span className={v.accent}>verify</span> your email
          </h1>
          <p className={v.lead}>
            The link may have expired or already been used. You can ask for a
            new one.
          </p>
          <div className={v.noticeError} role="alert">
            {errorMessage}
          </div>
          <Link href="/verify-email/sent" className={v.primaryBtn}>
            Send a new link
            <ArrowIcon />
          </Link>
          <Link href="/login" className={v.textLink}>
            Back to login
          </Link>
        </>
      ) : (
        <>
          <div className={v.spinner} aria-hidden="true" />
          <h1 className={v.title}>
            Verifying your <span className={v.accent}>email</span>
          </h1>
          <p className={v.lead} role="status">
            One moment, we&apos;re confirming your address.
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
          <p className={v.lead}>Loading...</p>
        </AuthShell>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}