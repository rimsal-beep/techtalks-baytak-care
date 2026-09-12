import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Dashboard } from "./View/DashBoard";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <Dashboard />
    </>
  );
}