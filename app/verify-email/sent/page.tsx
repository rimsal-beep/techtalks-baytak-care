"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { resendVerificationEmail } from "@/app/actions/emailVerification";
import AuthShell from "@/app/Components/AuthShell";
import f from "@/app/Components/AuthShell.module.css";

export default function VerificationSentPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const result = await resendVerificationEmail(email);
      setIsError(!result.success);
      setMessage(result.success ? result.message : result.error);
    } catch {
      setIsError(true);
      setMessage(
        "Unable to process your request right now. Please try again later."
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
      <p className={f.sub}>
        If you created an account, a verification link should arrive in your
        inbox. Open it to continue. Check your spam folder too.
      </p>

      <form onSubmit={handleSubmit}>
        <div className={f.field}>
          <label className={f.label} htmlFor="email">
            Didn&apos;t get it? Enter your email to resend
          </label>
          <input
            className={f.input}
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            maxLength={254}
            autoComplete="email"
          />
        </div>

        {message && (
          <div
            className={isError ? f.error : f.notice}
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        )}

        <button type="submit" className={f.submit} disabled={loading}>
          {loading ? "Sending..." : "Resend verification email"}
        </button>
      </form>

      <p className={f.foot}>
        <Link href="/login">Back to login</Link>
      </p>
    </AuthShell>
  );
}