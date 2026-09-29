"use client";

import { FormEvent, useState } from "react";
import { signup } from "../actions/auth";

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
    <main className="min-h-screen bg-[#F7F6F3] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-[#E4E1D9] p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F4E79] text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
              <path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" />
            </svg>
          </div>
          <span className="text-[17px] font-semibold text-[#181A1B]">Baytak Care</span>
        </div>

        <div className="mb-6">
          <h1 className="mb-1.5 text-[26px] leading-tight text-[#181A1B]" style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500 }}>
            Create your account
          </h1>
          <p className="text-[13.5px] leading-6 text-[#8B8D89]">
            Join Baytak Care and start managing your property with confidence.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="mb-1.5 block text-[12.5px] font-semibold text-[#5B5D5A]">Full name</label>
            <input
              id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name" required
              className="w-full rounded-lg border border-[#E4E1D9] bg-white px-3.5 py-2.5 text-sm text-[#181A1B] outline-none transition focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="mb-1.5 block text-[12.5px] font-semibold text-[#5B5D5A]">Email</label>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email" required
              className="w-full rounded-lg border border-[#E4E1D9] bg-white px-3.5 py-2.5 text-sm text-[#181A1B] outline-none transition focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="mb-1.5 block text-[12.5px] font-semibold text-[#5B5D5A]">Password</label>
            <input
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters" minLength={6} required
              className="w-full rounded-lg border border-[#E4E1D9] bg-white px-3.5 py-2.5 text-sm text-[#181A1B] outline-none transition focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="confirmPassword" className="mb-1.5 block text-[12.5px] font-semibold text-[#5B5D5A]">Confirm password</label>
            <input
              id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password" minLength={6} required
              className="w-full rounded-lg border border-[#E4E1D9] bg-white px-3.5 py-2.5 text-sm text-[#181A1B] outline-none transition focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#5B5D5A]">I am a</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setRole("OWNER")}
                className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${role === "OWNER" ? "border-[#1F4E79] bg-[#E9F0F6] text-[#1F4E79]" : "border-[#E4E1D9] bg-white text-[#5B5D5A] hover:border-[#1F4E79]"}`}>
                Owner
              </button>
              <button type="button" onClick={() => setRole("CARETAKER")}
                className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${role === "CARETAKER" ? "border-[#1F4E79] bg-[#E9F0F6] text-[#1F4E79]" : "border-[#E4E1D9] bg-white text-[#5B5D5A] hover:border-[#1F4E79]"}`}>
                Caretaker
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-[#F3D4D0] bg-[#FAEAE9] px-3.5 py-2.5 text-[13px] text-[#B42318]">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-[#1F4E79] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-[#8B8D89]">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-[#1F4E79] hover:underline">Log in</a>
        </p>
      </div>
    </main>
  );
}
