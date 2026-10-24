"use client";

import { FormEvent, Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signup } from "../actions/auth";
import AuthShell from "../Components/AuthShell";
import f from "../Components/AuthShell.module.css";
import {
  MIN_PASSWORD_LENGTH,
  validatePassword,
} from "../../lib/passwordPolicy";

const nameRegex = /^[\p{L}\p{M}]+(?:[\s'’-][\p{L}\p{M}]+)*$/u;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PasswordToggleIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      style={{ fill: "none" }}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {visible ? (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" fill="none" />
          <path d="M3 3l18 18" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" fill="none" />
        </>
      )}
    </svg>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The role is decided by the server from the invitation, never by this page.
  const nextParam = searchParams.get("next");
  const nextPath =
    nextParam && /^\/invite\/[a-f0-9]{64}$/.test(nextParam)
      ? nextParam
      : null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Blocks a second submit even before React re-renders (fast double clicks).
  // The real protection is still the server: unique email + rate limit.
  const submitting = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting.current) return;

    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    if (trimmedName.length > 100 || !nameRegex.test(trimmedName)) {
      setError(
        "Name can only contain letters, spaces, hyphens, and apostrophes.",
      );
      return;
    }

    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    if (trimmedEmail.length > 254 || !emailRegex.test(trimmedEmail)) {
      setError("Enter a valid email.");
      return;
    }

    const passwordError = validatePassword(password, {
      name: trimmedName,
      email: trimmedEmail,
    });

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    submitting.current = true;
    setLoading(true);

    try {
      const result = await signup({
        name: trimmedName,
        email: trimmedEmail,
        password,
        next: nextPath,
      });

      if (result.success === false) {
        setError(result.error);
        submitting.current = false;
        setLoading(false);
        return;
      }

      // Remember the email for the "check your email" page (this tab only,
      // never in the URL).
      try {
        sessionStorage.setItem(
          "baytak:pendingVerification",
          JSON.stringify({
            email: trimmedEmail.toLowerCase(),
            at: Date.now(),
            next: nextPath,
          }),
        );
      } catch {
        // storage unavailable: the sent page just shows an empty form
      }

      // Stay in the loading state while navigating.
      router.push("/verify-email/sent");
    } catch {
      setError("Something went wrong. Please try again.");
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <AuthShell wide>
      <h1 className={f.title}>Create your account</h1>
      <p className={f.sub}>
        Join Baytak Care and start managing your property with confidence.
      </p>

      {nextPath && (
        <div className={f.notice} role="status">
          You&apos;re creating an account from an invitation. Use the email
          address the invitation was sent to.
        </div>
      )}

      {/* Edge draws its own password eye. Hide it so only ours shows.
          Inline on purpose: AuthShell.module.css stays untouched. */}
      <style>{`
        #password::-ms-reveal,
        #confirmPassword::-ms-reveal {
          display: none;
        }
      `}</style>

      <form onSubmit={handleSubmit} noValidate>
        <div className={f.grid}>
          <div className={f.field}>
            <label className={f.label} htmlFor="name">
              Full name
            </label>
            <input
              className={f.input}
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
              maxLength={100}
              required
              suppressHydrationWarning
            />
          </div>

          <div className={f.field}>
            <label className={f.label} htmlFor="email">
              Email
            </label>
            <input
              className={f.input}
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              maxLength={254}
              required
              suppressHydrationWarning
            />
          </div>

          <div className={f.field}>
            <label className={f.label} htmlFor="password">
              Password
            </label>
            <div className={f.passwordField}>
              <input
                className={`${f.input} ${f.inputWithToggle}`}
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                autoComplete="new-password"
                required
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className={f.passwordToggle}
              >
                <PasswordToggleIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div className={f.field}>
            <label className={f.label} htmlFor="confirmPassword">
              Confirm password
            </label>
            <div className={f.passwordField}>
              <input
                className={`${f.input} ${f.inputWithToggle}`}
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
                aria-pressed={showConfirmPassword}
                className={f.passwordToggle}
              >
                <PasswordToggleIcon visible={showConfirmPassword} />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className={f.error} role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className={f.submit}
          disabled={loading}
          suppressHydrationWarning
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p>
        <span>Already have an account?</span>{" "}
        <a
          href={
            nextPath
              ? `/login?next=${encodeURIComponent(nextPath)}`
              : "/login"
          }
          className={f.foot}
        >
          Log in
        </a>
      </p>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  );
}