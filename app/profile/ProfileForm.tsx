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

const countryNames: Record<string, string> = {
  AC: "Ascension Island",
  AD: "Andorra",
  AE: "United Arab Emirates",
  AF: "Afghanistan",
  AG: "Antigua and Barbuda",
  AI: "Anguilla",
  AL: "Albania",
  AM: "Armenia",
  AO: "Angola",
  AR: "Argentina",
  AS: "American Samoa",
  AT: "Austria",
  AU: "Australia",
  AW: "Aruba",
  AX: "Åland Islands",
  AZ: "Azerbaijan",
  BA: "Bosnia and Herzegovina",
  BB: "Barbados",
  BD: "Bangladesh",
  BE: "Belgium",
  BF: "Burkina Faso",
  BG: "Bulgaria",
  BH: "Bahrain",
  BI: "Burundi",
  BJ: "Benin",
  BL: "Saint Barthélemy",
  BM: "Bermuda",
  BN: "Brunei",
  BO: "Bolivia",
  BQ: "Caribbean Netherlands",
  BR: "Brazil",
  BS: "Bahamas",
  BT: "Bhutan",
  BW: "Botswana",
  BY: "Belarus",
  BZ: "Belize",
  CA: "Canada",
  CC: "Cocos Islands",
  CD: "Democratic Republic of the Congo",
  CF: "Central African Republic",
  CG: "Republic of the Congo",
  CH: "Switzerland",
  CI: "Côte d'Ivoire",
  CK: "Cook Islands",
  CL: "Chile",
  CM: "Cameroon",
  CN: "China",
  CO: "Colombia",
  CR: "Costa Rica",
  CU: "Cuba",
  CV: "Cape Verde",
  CW: "Curaçao",
  CX: "Christmas Island",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DE: "Germany",
  DJ: "Djibouti",
  DK: "Denmark",
  DM: "Dominica",
  DO: "Dominican Republic",
  DZ: "Algeria",
  EC: "Ecuador",
  EE: "Estonia",
  EG: "Egypt",
  ER: "Eritrea",
  ES: "Spain",
  ET: "Ethiopia",
  FI: "Finland",
  FJ: "Fiji",
  FK: "Falkland Islands",
  FM: "Micronesia",
  FO: "Faroe Islands",
  FR: "France",
  GA: "Gabon",
  GB: "United Kingdom",
  GD: "Grenada",
  GE: "Georgia",
  GF: "French Guiana",
  GG: "Guernsey",
  GH: "Ghana",
  GI: "Gibraltar",
  GL: "Greenland",
  GM: "Gambia",
  GN: "Guinea",
  GP: "Guadeloupe",
  GQ: "Equatorial Guinea",
  GR: "Greece",
  GT: "Guatemala",
  GU: "Guam",
  GW: "Guinea-Bissau",
  GY: "Guyana",
  HK: "Hong Kong",
  HN: "Honduras",
  HR: "Croatia",
  HT: "Haiti",
  HU: "Hungary",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IM: "Isle of Man",
  IN: "India",
  IO: "British Indian Ocean Territory",
  IQ: "Iraq",
  IR: "Iran",
  IS: "Iceland",
  IT: "Italy",
  JE: "Jersey",
  JM: "Jamaica",
  JO: "Jordan",
  JP: "Japan",
  KE: "Kenya",
  KG: "Kyrgyzstan",
  KH: "Cambodia",
  KI: "Kiribati",
  KM: "Comoros",
  KN: "Saint Kitts and Nevis",
  KP: "North Korea",
  KR: "South Korea",
  KW: "Kuwait",
  KY: "Cayman Islands",
  KZ: "Kazakhstan",
  LA: "Laos",
  LB: "Lebanon",
  LC: "Saint Lucia",
  LI: "Liechtenstein",
  LK: "Sri Lanka",
  LR: "Liberia",
  LS: "Lesotho",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  LY: "Libya",
  MA: "Morocco",
  MC: "Monaco",
  MD: "Moldova",
  ME: "Montenegro",
  MF: "Saint Martin",
  MG: "Madagascar",
  MH: "Marshall Islands",
  MK: "North Macedonia",
  ML: "Mali",
  MM: "Myanmar",
  MN: "Mongolia",
  MO: "Macao",
  MP: "Northern Mariana Islands",
  MQ: "Martinique",
  MR: "Mauritania",
  MS: "Montserrat",
  MT: "Malta",
  MU: "Mauritius",
  MV: "Maldives",
  MW: "Malawi",
  MX: "Mexico",
  MY: "Malaysia",
  MZ: "Mozambique",
  NA: "Namibia",
  NC: "New Caledonia",
  NE: "Niger",
  NF: "Norfolk Island",
  NG: "Nigeria",
  NI: "Nicaragua",
  NL: "Netherlands",
  NO: "Norway",
  NP: "Nepal",
  NR: "Nauru",
  NU: "Niue",
  NZ: "New Zealand",
  OM: "Oman",
  PA: "Panama",
  PE: "Peru",
  PF: "French Polynesia",
  PG: "Papua New Guinea",
  PH: "Philippines",
  PK: "Pakistan",
  PL: "Poland",
  PM: "Saint Pierre and Miquelon",
  PN: "Pitcairn",
  PR: "Puerto Rico",
  PS: "Palestine",
  PT: "Portugal",
  PW: "Palau",
  PY: "Paraguay",
  QA: "Qatar",
  RE: "Réunion",
  RO: "Romania",
  RS: "Serbia",
  RU: "Russia",
  RW: "Rwanda",
  SA: "Saudi Arabia",
  SB: "Solomon Islands",
  SC: "Seychelles",
  SD: "Sudan",
  SE: "Sweden",
  SG: "Singapore",
  SH: "Saint Helena",
  SI: "Slovenia",
  SJ: "Svalbard and Jan Mayen",
  SK: "Slovakia",
  SL: "Sierra Leone",
  SM: "San Marino",
  SN: "Senegal",
  SO: "Somalia",
  SR: "Suriname",
  SS: "South Sudan",
  ST: "São Tomé and Príncipe",
  SV: "El Salvador",
  SX: "Sint Maarten",
  SY: "Syria",
  SZ: "Eswatini",
  TC: "Turks and Caicos Islands",
  TD: "Chad",
  TG: "Togo",
  TH: "Thailand",
  TJ: "Tajikistan",
  TK: "Tokelau",
  TL: "Timor-Leste",
  TM: "Turkmenistan",
  TN: "Tunisia",
  TO: "Tonga",
  TR: "Turkey",
  TT: "Trinidad and Tobago",
  TV: "Tuvalu",
  TW: "Taiwan",
  TZ: "Tanzania",
  UA: "Ukraine",
  UG: "Uganda",
  US: "United States",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VA: "Vatican City",
  VC: "Saint Vincent and the Grenadines",
  VE: "Venezuela",
  VG: "British Virgin Islands",
  VI: "U.S. Virgin Islands",
  VN: "Vietnam",
  VU: "Vanuatu",
  WF: "Wallis and Futuna",
  WS: "Samoa",
  XK: "Kosovo",
  YE: "Yemen",
  YT: "Mayotte",
  ZA: "South Africa",
  ZM: "Zambia",
  ZW: "Zimbabwe",
};

const nameRegex =
  /^[\p{L}\p{M}]+(?:[\s'’-][\p{L}\p{M}]+)*$/u;

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

function getInitialPhoneNumber(
  phone: string,
  country: CountryCode
) {
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
  const [country, setCountry] =
    useState<CountryCode>(initialCountry);
  const [phone, setPhone] = useState(
    getInitialPhoneNumber(initialPhone, initialCountry)
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const callingCode = `+${getCountryCallingCode(country)}`;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
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

    const phoneWithoutLeadingZeros =
      trimmedPhone.replace(/^0+/, "");

    const internationalPhone =
      `${callingCode}${phoneWithoutLeadingZeros}`;

    if (
      !isValidPhoneNumber(
        internationalPhone,
        country
      )
    ) {
      setError(
        "Please enter a valid international phone number."
      );
      return;
    }

    setLoading(true);

    const result = await updateProfile(
      trimmedName,
      internationalPhone
    );

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess("Profile saved successfully!");

    setTimeout(() => {
    router.push("/properties/new");
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
            <option
              key={countryCode}
              value={countryCode}
            >
              {countryNames[countryCode] ?? countryCode} (
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