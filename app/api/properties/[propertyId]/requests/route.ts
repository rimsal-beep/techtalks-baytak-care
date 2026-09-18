import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;

  const user = await getCurrentUser();

  if (!user) {
    return Response.json(
      { success: false, error: "Not logged in." },
      { status: 401 }
    );
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      ownerId: true,
      caretakerId: true,
    },
  });

  if (!property) {
    return Response.json(
      { success: false, error: "Property not found." },
      { status: 404 }
    );
  }

  const isAuthorized =
    property.ownerId === user.id || property.caretakerId === user.id;

  if (!isAuthorized) {
    return Response.json(
      { success: false, error: "Not authorized for this property." },
      { status: 403 }
    );
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    success: true,
    data: requests,
  });
}
