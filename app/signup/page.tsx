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
      window.location.href = "/waiting";
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17324D] text-xl font-bold text-white">
            B
          </div>
          <span className="text-xl font-bold text-[#17324D]">Baytak Care</span>
        </div>

        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-[#17324D]">Create your account</h1>
          <p className="text-sm leading-6 text-slate-500">
            Join Baytak Care and start managing your property with confidence.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">Full name</label>
            <input
              id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name" required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#17324D] outline-none transition focus:border-[#17324D] focus:ring-2 focus:ring-[#17324D]/20"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email" required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#17324D] outline-none transition focus:border-[#17324D] focus:ring-2 focus:ring-[#17324D]/20"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
            <input
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters" minLength={6} required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#17324D] outline-none transition focus:border-[#17324D] focus:ring-2 focus:ring-[#17324D]/20"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700">Confirm password</label>
            <input
              id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password" minLength={6} required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#17324D] outline-none transition focus:border-[#17324D] focus:ring-2 focus:ring-[#17324D]/20"
            />
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">I am a</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole("OWNER")}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${role === "OWNER" ? "border-[#17324D] bg-[#17324D]/10 text-[#17324D]" : "border-slate-300 bg-white text-slate-700 hover:border-[#17324D]"}`}>
                Owner
              </button>
              <button type="button" onClick={() => setRole("CARETAKER")}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${role === "CARETAKER" ? "border-[#17324D] bg-[#17324D]/10 text-[#17324D]" : "border-slate-300 bg-white text-slate-700 hover:border-[#17324D]"}`}>
                Caretaker
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-[#17324D] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-[#17324D] hover:underline">Log in</a>
        </p>
      </div>
    </main>
  );
}