"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js";
import { updateProfile } from "../actions/auth";

type ProfileFormProps = {
  initialName: string;
  initialPhone: string;
};

const countryNames = new Intl.DisplayNames(["en"], {
  type: "region",
});

const nameRegex = /^[\p{L}\p{M}]+(?:[\s'’-][\p{L}\p{M}]+)*$/u;

function getInitialCountry(phone: string): CountryCode {
  if (!phone) return "LB";

  for (const country of getCountries()) {
    const code = `+${getCountryCallingCode(country)}`;

    if (phone.startsWith(code)) {
      return country;
    }
  }

  return "LB";
}

function getInitialPhoneNumber(phone: string, country: CountryCode) {
  if (!phone) return "";

  const callingCode = `+${getCountryCallingCode(country)}`;

  if (phone.startsWith(callingCode)) {
    return phone.slice(callingCode.length).trim();
  }

  return phone;
}

export default function ProfileForm({
  initialName,
  initialPhone,
}: ProfileFormProps) {
  const router = useRouter();

  const initialCountry = getInitialCountry(initialPhone);

  const [name, setName] = useState(initialName);
  const [country, setCountry] = useState<CountryCode>(initialCountry);
  const [phone, setPhone] = useState(
    getInitialPhoneNumber(initialPhone, initialCountry)
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const callingCode = `+${getCountryCallingCode(country)}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    if (!nameRegex.test(trimmedName)) {
      setError(
        "Name can only contain letters, spaces, hyphens, and apostrophes."
      );
      return;
    }

    if (!trimmedPhone) {
      setError("Phone number is required.");
      return;
    }

    const phoneWithoutLeadingZeros = trimmedPhone.replace(/^0+/, "");
    const internationalPhone = `${callingCode}${phoneWithoutLeadingZeros}`;

    if (!isValidPhoneNumber(internationalPhone, country)) {
      setError("Please enter a valid international phone number.");
      return;
    }

    setLoading(true);

    const result = await updateProfile(trimmedName, internationalPhone);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess("Profile saved successfully!");

    setTimeout(() => {
      router.push("/");
    }, 1000);
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
          htmlFor="country"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Country
        </label>

        <select
          id="country"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value as CountryCode);
            setPhone("");
            setError("");
          }}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#17324D] outline-none transition focus:border-[#17324D] focus:ring-2 focus:ring-[#17324D]/20"
        >
          {getCountries().map((countryCode) => (
            <option key={countryCode} value={countryCode}>
              {countryNames.of(countryCode) ?? countryCode} (
              +{getCountryCallingCode(countryCode)})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label
          htmlFor="phone"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Phone number
        </label>

        <div className="flex gap-2">
          <div className="flex min-w-[72px] items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-[#17324D]">
            {callingCode}
          </div>

          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#17324D] outline-none transition focus:border-[#17324D] focus:ring-2 focus:ring-[#17324D]/20"
          />
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Enter the phone number without the country code.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          {success}
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