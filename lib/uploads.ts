import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Private uploads. The folder is OUTSIDE /public, so Next.js never serves it by itself.
 * Files are only served by app/uploads/[name]/route.ts, after a login and a property check.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "private-uploads");

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

export const UPLOAD_NAME = /^[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif|pdf)$/;

/** Looks at the first bytes. The type sent by the browser can be faked, the bytes cannot. */
function sniff(b: Buffer): string | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "GIF8") return "gif";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  if (b.length > 12 && b.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  return null;
}

/** Saves one file privately and returns the URL to store in the database ("/uploads/<uuid>.<ext>"). */
export async function saveUpload(
  file: File,
  opts: { allowPdf?: boolean; maxBytes?: number } = {},
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const maxBytes = opts.maxBytes ?? 5 * 1024 * 1024;
  if (file.size === 0) return { ok: false, error: "No file received." };
  if (file.size > maxBytes) return { ok: false, error: "Each file must be smaller than 5 MB." };

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = sniff(bytes);
  if (!ext || (ext === "pdf" && !opts.allowPdf)) {
    return { ok: false, error: opts.allowPdf ? "Use a photo or a PDF." : "Use a JPG, PNG, WebP or GIF photo." };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), bytes);
  return { ok: true, url: `/uploads/${name}` };
}
