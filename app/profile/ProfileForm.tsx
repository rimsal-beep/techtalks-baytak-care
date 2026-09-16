"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "../actions/auth";

type ProfileFormProps = {
  initialName: string;
  initialPhone: string;
};

export default function ProfileForm({
  initialName,
  initialPhone,
}: ProfileFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    setLoading(true);

    const result = await updateProfile(name, phone);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-5">
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Full name
        </label>

        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#17324D] outline-none transition focus:border-[#17324D] focus:ring-2 focus:ring-[#17324D]/20"
        />
      </div>

      <div className="mb-5">
        <label
          htmlFor="phone"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Phone number
        </label>

        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+961 70 123 456"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#17324D] outline-none transition focus:border-[#17324D] focus:ring-2 focus:ring-[#17324D]/20"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#17324D] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving..." : "Complete Profile"}
      </button>
    </form>
  );
}