"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signup } from "../actions/auth";
import AuthShell from "../Components/AuthShell";
import Link from "next/link";
import f from "../Components/AuthShell.module.css";

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
  const nextParam = searchParams.get("next");
  const nextPath =
    nextParam && /^\/invite\/[a-f0-9]{64}$/.test(nextParam) ? nextParam : null;
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
              onClick={() => setRole("OWNER")}
              aria-pressed={role === "OWNER"}
              className={role === "OWNER" ? `${f.role} ${f.roleOn}` : f.role}
              suppressHydrationWarning
            >
              <b>Owner</b>
              <span>I have a property to look after</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!nextPath) {
                  setError(
                    "Caretaker registration requires an invitation link.",
                  );
                  return;
                }

                setError("");
                setRole("CARETAKER");
              }}
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
            <input
              className={f.input}
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
              suppressHydrationWarning
            />
            <button
         type="button"
          onClick={() => setShowPassword(!showPassword)}
         aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
      >
         {showPassword ? "Hide" : "Show"}
          </button>
          </div>

          <div className={f.field}>
            <label className={f.label} htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              className={f.input}
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              minLength={8}
              required
              suppressHydrationWarning
            />
            <button
      type="button"
     onClick={() => setShowConfirmPassword(!showConfirmPassword)}
      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
     aria-pressed={showConfirmPassword}
>
     {showConfirmPassword ? "Hide" : "Show"}
    </button>
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
  <Link href="/login">Log in</Link>
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
