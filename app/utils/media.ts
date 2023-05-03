export function getTitle(url?: string): string {
  if (!url) return "";
  return url.split("/").pop() || "";
}
