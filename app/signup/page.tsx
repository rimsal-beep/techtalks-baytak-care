"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signup } from "../actions/auth";
import AuthShell from "../Components/AuthShell";
import f from "../Components/AuthShell.module.css";

function PasswordToggleIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      stroke="currentColor"
      strokeWidth="1.8"
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"OWNER" | "CARETAKER" | "">("");
  const searchParams = useSearchParams();

  function handleRoleSelect(nextRole: "OWNER" | "CARETAKER") {
    if (nextRole === "CARETAKER" && !nextPath) {
      setError("Caretaker registration requires an invitation link.");
      return;
    }

    setError("");
    setRole((currentRole) => (currentRole === nextRole ? "" : nextRole));
  }

  const nextParam = searchParams.get("next");
  const nextPath =
    nextParam && /^\/invite\/[a-f0-9]{64}$/.test(nextParam)
      ? nextParam
      : null;
  const MIN_PASSWORD_LENGTH = 6;   
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    const nameRegex = /^[\p{L}\p{M}]+(?:[\s'’-][\p{L}\p{M}]+)*$/u;

    if (!nameRegex.test(trimmedName)) {
      setError(
        "Name can only contain letters, spaces, hyphens, and apostrophes.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!role) {
      setError("Please choose a role.");
      return;
    }

    setLoading(true);

    const result = await signup({
      name: trimmedName,
      email,
      password,
      role,
      next: role === "CARETAKER" ? nextPath : null,
    });

    if (result.success === false) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/verify-email/sent");
  }

  return (
    <AuthShell wide>
      <h1 className={f.title}>Create your account</h1>
      <p className={f.sub}>
        Join Baytak Care and start managing your property with confidence.
      </p>

      <form onSubmit={handleSubmit}>
        <div className={f.field}>
          <span className={f.label}>I am a</span>

          <div className={f.roles}>
            <button
              type="button"
              onClick={() => handleRoleSelect("OWNER")}
              aria-pressed={role === "OWNER"}
              className={role === "OWNER" ? `${f.role} ${f.roleOn}` : f.role}
              suppressHydrationWarning
            >
              <b>Owner</b>
              <span>I have a property to look after</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect("CARETAKER")}
              aria-pressed={role === "CARETAKER"}
              className={
                role === "CARETAKER" ? `${f.role} ${f.roleOn}` : f.role
              }
              suppressHydrationWarning
            >
              <b>Caretaker</b>
              <span>I look after a property</span>
            </button>
          </div>
        </div>

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
                minLength={MIN_PASSWORD_LENGTH}
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
                minLength={MIN_PASSWORD_LENGTH}
                required
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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