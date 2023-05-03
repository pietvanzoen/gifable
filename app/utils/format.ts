import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(localizedFormat);

export function formatDate(date: string | Date) {
  if (!date) return "";
  return dayjs(date).format("lll");
}
