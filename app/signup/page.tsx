"use client";

import { FormEvent, useState } from "react";
import { signup } from "../actions/auth";
import AuthShell from "../Components/AuthShell";
import f from "../Components/AuthShell.module.css";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"OWNER" | "CARETAKER" | "">("");
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
      setError("Name can only contain letters, spaces, hyphens, and apostrophes.");
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
    });

    if (result.success === false) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (role === "OWNER") {
      window.location.href = "/profile";
    } else {
      window.location.href = "/caretaker/dashboard";
    }
  }

  return (
    <AuthShell wide>
      <h1 className={f.title}>Create your account</h1>
      <p className={f.sub}>Join Baytak Care and start managing your property with confidence.</p>

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
              onClick={() => setRole("CARETAKER")}
              aria-pressed={role === "CARETAKER"}
              className={role === "CARETAKER" ? `${f.role} ${f.roleOn}` : f.role}
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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
              suppressHydrationWarning
            />
          </div>

          <div className={f.field}>
            <label className={f.label} htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              className={f.input}
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              minLength={6}
              required
              suppressHydrationWarning
            />
          </div>
        </div>

        {error && (
          <div className={f.error} role="alert">
            {error}
          </div>
        )}

        <button type="submit" className={f.submit} disabled={loading} suppressHydrationWarning>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className={f.foot}>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </AuthShell>
  );
}
