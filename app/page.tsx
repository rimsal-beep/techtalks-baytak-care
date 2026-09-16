import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Dashboard } from "./View/DashBoard";

export default async function Home() {
  const user = await getCurrentUser();
  console.log("DEBUG - current user:", user);

  if (!user) {
    redirect("/login");
  }

 
  
    return <Dashboard propertyId={user.propertyId} />;
    
  
}
