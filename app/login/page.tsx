"use client";

import { FormEvent, useState } from "react";
import { login } from "../actions/login";
import { useRouter } from "next/navigation";

export default function LoginPage() {
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
      router.push("/");
    } else {
      setError(response.error ?? "Login failed.");
      setLoading(false);
    }
  }

  return (
    <main className="auth-wrap">
      <div className="auth-box fade-in">
        <div className="brand-mark">
          <div className="logo">B</div>
          <span>Baytak</span>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: "30px",
              lineHeight: "1.2",
              margin: "0 0 8px",
            }}
          >
            Welcome back
          </h1>

          <p
            className="muted"
            style={{
              fontSize: "14px",
              lineHeight: "1.5",
              margin: 0,
            }}
          >
            Log in to manage your property with confidence.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>

            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div
              style={{
                background: "var(--danger-tint)",
                color: "var(--danger)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 12px",
                fontSize: "12.5px",
                marginBottom: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary"
            disabled={loading}
            style={{
              width: "100%",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p
          className="small muted"
          style={{
            textAlign: "center",
            marginTop: "18px",
          }}
        >
          Do not have an account?{" "}
          <a href="/signup">Create an account</a>
        </p>
      </div>
    </main>
  );
}