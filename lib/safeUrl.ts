// Only our own uploads or https links. Blocks javascript: and data: links.
export function safeUrl(url: string): string {
  return /^\/uploads\/[\w.-]+$/.test(url) || /^https:\/\//i.test(url) ? url : "";
}