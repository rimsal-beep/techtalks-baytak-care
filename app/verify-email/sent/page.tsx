"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resendVerificationEmail } from "@/app/actions/emailVerification";
import AuthShell from "@/app/Components/AuthShell";
import f from "@/app/Components/AuthShell.module.css";
import v from "../VerifyEmail.module.css";

// The email is kept in sessionStorage (this tab only), never in the URL.
const STORAGE_KEY = "baytak:pendingVerification";
const COOLDOWN_SECONDS = 60;

type Pending = { email: string; at: number; next?: string | null };

// Webmail shortcuts, so people can reach their inbox in one click.
const INBOXES: Record<string, { name: string; url: string }> = {
  "gmail.com": { name: "Gmail", url: "https://mail.google.com" },
  "googlemail.com": { name: "Gmail", url: "https://mail.google.com" },
  "outlook.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "hotmail.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "live.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "msn.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "yahoo.com": { name: "Yahoo Mail", url: "https://mail.yahoo.com" },
  "icloud.com": { name: "iCloud Mail", url: "https://www.icloud.com/mail" },
  "me.com": { name: "iCloud Mail", url: "https://www.icloud.com/mail" },
  "proton.me": { name: "Proton Mail", url: "https://mail.proton.me" },
  "protonmail.com": { name: "Proton Mail", url: "https://mail.proton.me" },
};

function getInbox(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? (INBOXES[domain] ?? null) : null;
}

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

function VerificationSentContent() {
  const searchParams = useSearchParams();
  const failedInUrl = searchParams.get("emailFailed") === "1";

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pending = useMemo(() => parsePending(raw), [raw]);

  const [typedEmail, setTypedEmail] = useState("");
  const [failureDismissed, setFailureDismissed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const knownEmail = pending?.email ?? "";
  const email = knownEmail || typedEmail;
  const emailFailed = failedInUrl && !failureDismissed;
  const inbox = knownEmail ? getInbox(knownEmail) : null;

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

    setMessage("");
    setLoading(true);

    try {
      const result = await resendVerificationEmail(email, pending?.next ?? null);

      if (result.success) {
        const sentAt = Date.now();
        setIsError(false);
        setMessage(
          "If your account still needs verification, a new link is on its way. It can take a minute to arrive.",
        );
        setNow(sentAt);
        setFailureDismissed(true);
        writePending({
          email: email.trim().toLowerCase(),
          at: sentAt,
          next: pending?.next ?? null,
        });
      } else {
        setIsError(true);
        setMessage(result.error);
      }
    } catch {
      setIsError(true);
      setMessage(
        "Unable to process your request right now. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className={f.iconCircle} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      </div>

      <h1 className={f.title}>Check your email</h1>

      {emailFailed && (
        <div className={f.error} role="alert">
          We couldn&apos;t send your verification email. Press the button below
          to try again.
        </div>
      )}

      {knownEmail ? (
        <>
          <p className={f.sub}>
            {emailFailed
              ? "We tried to send a verification link to"
              : "We sent a verification link to"}
          </p>
          <div className={v.chipRow}>
            <span className={v.emailChip}>{knownEmail}</span>
          </div>
        </>
      ) : (
        <p className={f.sub}>
          If you created an account, a verification link should arrive in your
          inbox. Enter your email below to get a new one.
        </p>
      )}

      {inbox && !emailFailed && (
        <div className={f.actions}>
          <a
            href={inbox.url}
            target="_blank"
            rel="noopener noreferrer"
            className={f.btnPrimary}
          >
            Open {inbox.name}
          </a>
        </div>
      )}

      <p className={v.hint}>
        Click the link in the email to finish. It expires in 24 hours. Can&apos;t
        find it? Check your spam folder.
      </p>

      <div className={v.divider} />

      <form onSubmit={handleSubmit}>
        <p className={v.resendLabel}>Didn&apos;t get it?</p>

        {!knownEmail && (
          <div className={f.field}>
            <label className={f.label} htmlFor="email">
              Your email
            </label>
            <input
              className={f.input}
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

        {message && (
          <div
            className={isError ? f.error : f.notice}
            role={isError ? "alert" : "status"}
            aria-live="polite"
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          className={knownEmail ? f.secondary : f.submit}
          disabled={loading || cooldown > 0}
        >
          {loading
            ? "Sending..."
            : cooldown > 0
              ? `Resend available in ${cooldown}s`
              : emailFailed
                ? "Try sending again"
                : "Resend email"}
        </button>
      </form>

      <p className={f.foot}>
        <Link href="/signup">Wrong email? Sign up again</Link>
      </p>
      <p className={f.foot}>
        <Link href="/login">Back to login</Link>
      </p>
    </AuthShell>
  );
}

export default function VerificationSentPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className={f.sub}>Loading...</p>
        </AuthShell>
      }
    >
      <VerificationSentContent />
    </Suspense>
  );
}