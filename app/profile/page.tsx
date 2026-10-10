import { redirect } from "next/navigation";
import { requireVerifiedUser } from "../../lib/session";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
 const auth = await requireVerifiedUser();

if (!auth.success) {
  redirect("/login");
}

const user = auth.user;

if (user.role !== "OWNER") {
  redirect("/caretaker/dashboard");
}

  return (
    <main className="min-h-screen bg-[#F7F6F3] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-[#E4E1D9] p-8">

        {/* Baytak Care logo */}
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F4E79] text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
              <path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" />
            </svg>
          </div>
          <span className="text-[17px] font-semibold text-[#181A1B]">Baytak Care</span>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1
            className="mb-1.5 text-[26px] leading-tight text-[#181A1B]"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500 }}
          >
            Complete your profile
          </h1>
          <p className="text-[13.5px] leading-6 text-[#8B8D89]">
            Add your phone number to complete your owner profile.
          </p>
        </div>

        {/* Form */}
        <ProfileForm
          initialName={user.name}
          initialPhone={user.phone ?? ""}
        />
      </div>
    </main>
  );
}
