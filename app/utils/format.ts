import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import "dayjs/locale/en-gb";

dayjs.extend(localizedFormat);
dayjs.locale("en-gb");

export function formatDate(date: string | Date) {
  if (!date) return "";
  return dayjs(date).format("lll");
}

export function formatBytes(bytes?: number | null | undefined) {
  if (!bytes) return "";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
  return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
}
