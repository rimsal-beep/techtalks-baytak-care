import { prisma } from "@/lib/prisma";
<<<<<<< HEAD
=======
import { getCurrentUser } from "@/lib/session";
>>>>>>> cbf2b5ace1f2cf1bb7623bcdf4ba9aa7800ed9b2

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;

<<<<<<< HEAD
=======
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ success: false, error: "Not logged in." }, { status: 401 });
  }

  if (user.propertyId !== propertyId) {
    return Response.json({ success: false, error: "Not authorized for this property." }, { status: 403 });
  }

>>>>>>> cbf2b5ace1f2cf1bb7623bcdf4ba9aa7800ed9b2
  const requests = await prisma.maintenanceRequest.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });

<<<<<<< HEAD
  return Response.json({
    success: true,
    data: requests,
  });
=======
  return Response.json({ success: true, data: requests });
>>>>>>> cbf2b5ace1f2cf1bb7623bcdf4ba9aa7800ed9b2
}