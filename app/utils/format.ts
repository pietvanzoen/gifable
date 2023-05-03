import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import "dayjs/locale/en-gb";

dayjs.extend(localizedFormat);
dayjs.locale("en-gb");

export function formatDate(date: string | Date) {
  if (!date) return "";
  return dayjs(date).format("lll");
}
