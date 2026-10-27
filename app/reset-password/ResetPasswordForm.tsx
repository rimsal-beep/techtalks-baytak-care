"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/app/actions/resetPassword";
import AuthShell from "../Components/AuthShell";
import f from "../Components/AuthShell.module.css";

const initialState = {
  success: false,
  message: "",
  error: "",
};

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [state, formAction, pending] = useActionState(
    resetPassword,
    initialState
  );

  return (
    <AuthShell>
      <h1 className={f.title}>Reset password</h1>

      <p className={f.sub}>
        Choose a new password for your Baytak Care account.
      </p>

      {!state.success && (
        <form action={formAction}>
          <input type="hidden" name="token" value={token} />

          <div className={f.field}>
            <label className={f.label} htmlFor="password">
              New password
            </label>
            <input
              className={f.input}
              id="password"
              name="password"
              type="password"
              placeholder="Enter your new password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </div>

          <div className={f.field}>
            <label className={f.label} htmlFor="confirmPassword">
              Confirm new password
            </label>
            <input
              className={f.input}
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </div>

          {state.error && (
            <div className={f.error} role="alert">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            className={f.submit}
            disabled={pending || !token}
          >
            {pending ? "Resetting password..." : "Reset password"}
          </button>
        </form>
      )}

      {state.message && (
        <p role="status" className={f.sub}>
          {state.message}
        </p>
      )}

      {state.success && (
        <p className={f.foot}>
          <Link href="/login">Go to login</Link>
        </p>
      )}

      {!state.success && (
        <p className={f.foot}>
          <Link href="/forgot-password">Request a new reset link</Link>
        </p>
      )}
    </AuthShell>
  );
}