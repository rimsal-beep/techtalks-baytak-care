
import { prisma } from "@/lib/prisma";
import { requireVerifiedUser } from "@/lib/session";
import { requestScope } from "@/lib/authz";
import { CONTENT_TYPES, UPLOAD_NAME, readUpload } from "@/lib/uploads";

/**
 * Serves /uploads/<uuid>.<ext> ONLY to a logged-in user who may see the request the file belongs to.
 * IMPORTANT: the folder public/uploads must NOT exist, otherwise Next.js serves the files before this runs.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  const auth = await requireVerifiedUser();

if (!auth.success) {
  return new Response(auth.error, { status: 401 });
}

const user = auth.user;

  // Same answer for "no such file" and "not yours".
  const missing = () => new Response("Not found.", { status: 404 });
  if (!UPLOAD_NAME.test(name)) return missing();

  const url = `/uploads/${name}`;
  const allowed = await prisma.maintenanceRequest.findFirst({
    where: {
      ...requestScope(user),
      OR: [
        { issuePhotoUrls: { has: url } },
        { beforePhotoUrls: { has: url } },
        { afterPhotoUrls: { has: url } },
        { receiptUrl: url },
      ],
    },
    select: { id: true },
  });
  if (!allowed) return missing();

   const file = await readUpload(name); 
  if (!file) return missing();

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": CONTENT_TYPES[name.split(".").pop() ?? ""] ?? "application/octet-stream",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
