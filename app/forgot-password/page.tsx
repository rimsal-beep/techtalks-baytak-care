"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "../actions/passwordReset";
import AuthShell from "../Components/AuthShell";
import f from "../Components/AuthShell.module.css";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    { message: "", error: "" }
  );

  return (
    <AuthShell>
      <h1 className={f.title}>Forgot password?</h1>

      <p className={f.sub}>
        Enter your email address and, if an account exists, we will send you
        instructions to reset your password.
      </p>

      <form action={formAction}>
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
            maxLength={254}
            autoComplete="email"
            required
          />
        </div>

        {state.error && (
          <div className={f.error} role="alert">
            {state.error}
          </div>
        )}

        {state.message && (
          <p role="status" className={f.sub}>
            {state.message}
          </p>
        )}

        <button type="submit" className={f.submit} disabled={pending}>
          {pending ? "Please wait..." : "Send reset link"}
        </button>
      </form>

      <p className={f.foot}>
        <Link href="/login">Back to login</Link>
      </p>
    </AuthShell>
  );
}