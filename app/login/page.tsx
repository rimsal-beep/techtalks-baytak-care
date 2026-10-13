"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "../actions/login";
import AuthShell from "../Components/AuthShell";
import f from "../Components/AuthShell.module.css";

function LoginContent() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const MIN_PASSWORD_LENGTH=6;
  const nextPath =
    nextParam && /^\/invite\/[a-f0-9]{64}$/.test(nextParam)
      ? nextParam
      : null;
  const [state, formAction, pending] = useActionState(login, { error: "" });

  return (
    <AuthShell>
      <h1 className={f.title}>Welcome back</h1>
      <p className={f.sub}>Log in to manage your property with confidence.</p>

      <form action={formAction}>
        {nextPath && <input type="hidden" name="next" value={nextPath} />}
        <div className={f.field}>
          <label className={f.label} htmlFor="email">
            Email
          </label>

          <input
            className={f.input}
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            required
          />
        </div>

        <div className={f.field}>
          <label className={f.label} htmlFor="password">
            Password
          </label>

          <input
            className={f.input}
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </div>

        {state.error && (
          <div className={f.error} role="alert">
            {state.error}
          </div>
        )}

        <button type="submit" className={f.submit} disabled={pending}>
          {pending ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className={f.foot}>
        Do not have an account? <a href={nextPath ? `/signup?next=${encodeURIComponent(nextPath)}` : "/signup"}>Create an account</a>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}