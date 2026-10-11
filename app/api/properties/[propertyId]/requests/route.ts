import { prisma } from "@/lib/prisma";
import { requirePropertyMember, requestScope } from "@/lib/authz";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;

  // logged in + owner or assigned caretaker of THIS property
  const a = await requirePropertyMember(propertyId);
  if (!a.ok) {
    return Response.json(
      { success: false, error: a.error },
      {
        status: a.kind === "login" ? 401 : 404, // missing and "not yours" look the same
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where: { propertyId: a.property.id, ...requestScope(a.user) },
    orderBy: { createdAt: "desc" },
    take: 200,
    // only what the dashboard shows. No reportedById, approvedById, contractor fields.
    select: {
      id: true,
      title: true,
      description: true,
      requestType: true,
      priority: true,
      status: true,
      estimatedCost: true,
      currency: true,
      estimateNote: true,
      actualCost: true,
      rejectionReason: true,
      issuePhotoUrls: true,
      beforePhotoUrls: true,
      afterPhotoUrls: true,
      receiptUrl: true,
      approvedAt: true,
      rejectedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
      propertyId: true,
    },
  });

  return Response.json(
    { success: true, data: requests },
    { headers: { "Cache-Control": "no-store" } }
  );
}