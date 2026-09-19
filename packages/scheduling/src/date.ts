import { formatInTimeZone } from "date-fns-tz";
import { pl } from "date-fns/locale";

export const DEFAULT_TIME_ZONE = "Europe/Warsaw";

export function formatZonedDateTime(
  instant: Date | string | number,
  format = "Pp",
  timeZone = DEFAULT_TIME_ZONE,
) {
  return formatInTimeZone(instant, timeZone, format, { locale: pl });
}
