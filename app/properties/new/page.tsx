import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import PropertyForm from "./PropertyForm";

export default async function NewPropertyPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "OWNER") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-xl">
        <header className="mb-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-700" />
            <span className="text-xl font-bold">Baytak Care</span>
          </div>
          <p className="mb-2 text-sm font-bold tracking-wide text-blue-700">
            PROPERTY SETUP
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Add a property
          </h1>
          <p className="mt-3 text-slate-600">
            Add the property address now. You can add more properties afterward.
          </p>
        </header>

        <PropertyForm />
      </div>
    </main>
  );
}
