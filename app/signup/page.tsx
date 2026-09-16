"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signup } from "../actions/auth";

export default function SignupPage() {
  const router = useRouter();

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
      name,
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
      router.push("/profile");
    } else {
      router.push("/waiting");
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
            Create your account
          </h1>

          <p
            className="muted"
            style={{
              fontSize: "14px",
              lineHeight: "1.5",
              margin: 0,
            }}
          >
            Join Baytak and start managing your property with confidence.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              minLength={6}
              required
            />
          </div>

          <div className="field">
            <label>I am a</label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => setRole("OWNER")}
                style={{
                  background:
                    role === "OWNER"
                      ? "var(--brand-tint)"
                      : "var(--surface)",
                  color:
                    role === "OWNER"
                      ? "var(--brand)"
                      : "var(--ink)",
                  border:
                    role === "OWNER"
                      ? "1px solid var(--brand)"
                      : "1px solid var(--border)",
                }}
              >
                Owner
              </button>

              <button
                type="button"
                onClick={() => setRole("CARETAKER")}
                style={{
                  background:
                    role === "CARETAKER"
                      ? "var(--brand-tint)"
                      : "var(--surface)",
                  color:
                    role === "CARETAKER"
                      ? "var(--brand)"
                      : "var(--ink)",
                  border:
                    role === "CARETAKER"
                      ? "1px solid var(--brand)"
                      : "1px solid var(--border)",
                }}
              >
                Caretaker
              </button>
            </div>
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
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p
          className="small muted"
          style={{
            textAlign: "center",
            marginTop: "18px",
          }}
        >
          Already have an account?{" "}
          <a href="/login">Log in</a>
        </p>
      </div>
    </main>
  );
}