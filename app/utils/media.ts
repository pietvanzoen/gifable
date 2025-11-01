export function getTitle(url?: string): string {
  if (!url) return "";
  return url.split("/").pop() || "";
}

export function getProxyImageUrl(mediaId: string): string {
  return `/media/${mediaId}/image`;
}

export function getProxyThumbnailUrl(mediaId: string): string {
  return `/media/${mediaId}/thumbnail`;
}
