"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { resendVerificationEmail } from "@/app/actions/emailVerification";
import AuthShell from "@/app/Components/AuthShell";
import v from "../VerifyEmail.module.css";

// The email is kept in sessionStorage (this tab only), never in the URL.
const STORAGE_KEY = "baytak:pendingVerification";
const COOLDOWN_SECONDS = 60;

type Pending = { email: string; at: number; next?: string | null };

// --- tiny external store around sessionStorage -------------------------------
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

function writePending(value: Pending) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // storage unavailable: ignore
  }
  listeners.forEach((listener) => listener());
}

function parsePending(raw: string | null): Pending | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.email === "string" && typeof parsed?.at === "number") {
      return {
        email: parsed.email,
        at: parsed.at,
        next: typeof parsed.next === "string" ? parsed.next : null,
      };
    }
  } catch {
    // corrupted value: treat as empty
  }
  return null;
}
// -----------------------------------------------------------------------------

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 7.5l8.5 6 8.5-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function VerificationSentPage() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pending = useMemo(() => parsePending(raw), [raw]);

  const [typedEmail, setTypedEmail] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const knownEmail = pending?.email ?? "";
  const email = knownEmail || typedEmail;

  const cooldown =
    pending && pending.at > 0
      ? Math.max(
          0,
          Math.ceil((pending.at + COOLDOWN_SECONDS * 1000 - now) / 1000),
        )
      : 0;

  // Ticks only while the cooldown is running (the server enforces the real limit).
  const cooldownActive = cooldown > 0;
  useEffect(() => {
    if (!cooldownActive) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooldownActive]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || cooldown > 0) return;

    setErrorMessage("");
    setLoading(true);

    try {
      const result = await resendVerificationEmail(email, pending?.next ?? null);

      if (result.success) {
        const sentAt = Date.now();
        setNow(sentAt);
        writePending({
          email: email.trim().toLowerCase(),
          at: sentAt,
          next: pending?.next ?? null,
        });
      } else {
        setErrorMessage(result.error);
      }
    } catch {
      setErrorMessage(
        "Unable to process your request right now. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className={v.tile} aria-hidden="true">
        <MailIcon />
      </div>

      <h1 className={v.title}>
        Check your <span className={v.accent}>email</span>
      </h1>

      {knownEmail ? (
        <>
          <p className={v.lead}>We sent a confirmation link to:</p>
          <div className={v.emailBox}>
            <MailIcon />
            <span>{knownEmail}</span>
          </div>
        </>
      ) : (
        <p className={v.lead}>
          Enter your email and we&apos;ll send you a new confirmation link.
        </p>
      )}

      <ol className={v.steps}>
        <li>
          <span className={v.stepNum}>1</span>
          <span>Open the email from Baytak Care.</span>
        </li>
        <li>
          <span className={v.stepNum}>2</span>
          <span>
            Tap <strong>Confirm my email</strong>. The link works for 24 hours.
          </span>
        </li>
        <li>
          <span className={v.stepNum}>3</span>
          <span>Log in and you&apos;re in.</span>
        </li>
      </ol>

      {errorMessage ? (
        <div className={v.noticeError} role="alert">
          {errorMessage}
        </div>
      ) : knownEmail && cooldown > 0 ? (
        <div className={v.noticeOk} role="status">
          <CheckIcon />
          <span>Sent. The newest link is the only one that works.</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        {!knownEmail && (
          <div className={v.field}>
            <label className={v.label} htmlFor="email">
              Your email
            </label>
            <input
              className={v.input}
              id="email"
              type="email"
              value={typedEmail}
              onChange={(event) => setTypedEmail(event.target.value)}
              placeholder="you@example.com"
              required
              maxLength={254}
              autoComplete="email"
            />
          </div>
        )}

        <button
          type="submit"
          className={v.resendBtn}
          disabled={loading || cooldown > 0}
        >
          {loading
            ? "Sending..."
            : cooldown > 0
              ? `Resend in ${formatTimer(cooldown)}`
              : "Resend email"}
        </button>
      </form>

      <p className={v.footer}>
        Wrong address? <Link href="/signup">Sign up again</Link>
      </p>
    </AuthShell>
  );
}