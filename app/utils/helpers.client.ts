export function copyToClipboard(text: string | null, onSuccess = () => {}) {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text);
    onSuccess();
  } else {
    console.error(`navigator.clipboard.writeText is not supported.`, {
      text,
    });
  }
}
