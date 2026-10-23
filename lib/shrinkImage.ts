// Shrinks a photo in the browser before upload.
// If anything goes wrong, the original file is returned unchanged.
const MAX_SIDE = 1600;
const QUALITY = 0.8;
const SKIP_BELOW_BYTES = 400 * 1024;

export async function shrinkImage(file: File): Promise<File> {
  try {
    if (!file.type.startsWith("image/")) return file;
    if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
    if (file.size <= SKIP_BELOW_BYTES) return file;

    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.fillStyle = "#ffffff"; // transparent PNGs would turn black as JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file; // e.g. HEIC that this browser cannot decode
  }
}