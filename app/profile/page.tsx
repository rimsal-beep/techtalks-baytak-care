import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/session";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "OWNER") {
    redirect("/waiting");
  }

  return (
    <main className="min-h-screen bg-[#F5F1E8] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        
        {/* Baytak Care logo */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17324D] text-xl font-bold text-white">
            B
          </div>

          <span className="text-xl font-bold text-[#17324D]">
            Baytak Care
          </span>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-[#17324D]">
            Complete your profile
          </h1>

          <p className="text-sm leading-6 text-slate-500">
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