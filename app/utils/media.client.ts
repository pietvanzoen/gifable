import { getTitle } from "./media";

export async function downloadURL(url: string): Promise<void> {
  const resp = await fetch(url, { mode: "no-cors" });

  const blob = await resp.blob();

  const filename = getTitle(url);

  saveBlob(blob, filename);
}

function saveBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
