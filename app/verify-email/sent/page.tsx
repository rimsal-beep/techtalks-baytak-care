
"use client";

import { FormEvent, useState } from "react";
import { resendVerificationEmail } from "@/app/actions/emailVerification";

export default function VerificationSentPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const result = await resendVerificationEmail(email);
      setMessage(result.success ? result.message : result.error);
    } catch {
      setMessage(
        "Unable to process your request right now. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "80px auto", padding: 24 }}>
      <h1>Check your email</h1>
      <p>
        If you created an account, verification instructions
        should arrive in your inbox. Check your spam folder too.
    </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          maxLength={254}
          autoComplete="email"
          style={{
            display: "block",
            width: "100%",
            padding: 10,
            margin: "8px 0 16px",
          }}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Resend verification email"}
        </button>
      </form>

      {message && <p role="status" aria-live="polite">{message}</p>}

      <p>
        <a href="/login">Return to login</a>
      </p>
    </main>
  );
}
