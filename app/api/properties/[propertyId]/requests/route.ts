import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;

  const requests = await prisma.maintenanceRequest.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    success: true,
    data: requests,
  });
}