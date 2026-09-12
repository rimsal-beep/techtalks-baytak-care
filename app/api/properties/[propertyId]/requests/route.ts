import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ success: false, error: "Not logged in." }, { status: 401 });
  }

  if (user.propertyId !== propertyId) {
    return Response.json({ success: false, error: "Not authorized for this property." }, { status: 403 });
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ success: true, data: requests });
}