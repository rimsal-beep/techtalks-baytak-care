"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "../actions/login";
import { useRouter } from "next/navigation";
import AuthShell from "../Components/AuthShell";
import f from "../Components/AuthShell.module.css";

function LoginContent() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const nextPath =
    nextParam && /^\/invite\/[a-f0-9]{64}$/.test(nextParam)
      ? nextParam
      : null;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const response = await login({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });

    if (response.success) {
      if (response.data?.role === "CARETAKER") {
        router.push(nextPath ?? "/caretaker/dashboard");
      } else {
        router.push("/");
      }
    } else {
      setError(response.error ?? "Login failed.");
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 className={f.title}>Welcome back</h1>
      <p className={f.sub}>Log in to manage your property with confidence.</p>

      <form onSubmit={handleSubmit}>
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
            name="password"
            type="password"
            placeholder="Enter your password"
            required
            suppressHydrationWarning
          />
        </div>

        {error && (
          <div className={f.error} role="alert">
            {error}
          </div>
        )}

        <button type="submit" className={f.submit} disabled={loading} suppressHydrationWarning>
          {loading ? "Logging in..." : "Log in"}
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