import { cookies } from "next/headers";
async function getpropertyId() {
  const cookieStore = await cookies();
  return cookieStore.get("propertyId")?.value ?? "";
}

export { getpropertyId };