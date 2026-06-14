import { format, toZonedTime } from 'date-fns-tz';
import { isToday, isTomorrow } from 'date-fns';

const AEST = 'Australia/Sydney';

export function toAEST(utcDateString: string): string {
  const date = new Date(utcDateString);
  const zoned = toZonedTime(date, AEST);
  return format(zoned, "EEE d MMM, h:mm a 'AEST'", { timeZone: AEST });
}

export function toAESTTime(utcDateString: string): string {
  const date = new Date(utcDateString);
  const zoned = toZonedTime(date, AEST);
  return format(zoned, "h:mm a", { timeZone: AEST });
}

export function toAESTDate(utcDateString: string): string {
  const date = new Date(utcDateString);
  const zoned = toZonedTime(date, AEST);
  return format(zoned, 'EEE d MMM', { timeZone: AEST });
}

export function matchDayLabel(utcDateString: string): string {
  const date = new Date(utcDateString);
  const aestDate = toZonedTime(date, AEST);
  if (isToday(aestDate)) return 'Today';
  if (isTomorrow(aestDate)) return 'Tomorrow';
  return toAESTDate(utcDateString);
}

export function isMatchLive(status: string): boolean {
  return status === 'STATUS_IN_PROGRESS' || status === 'STATUS_HALFTIME';
}

export function isMatchFinished(status: string): boolean {
  return status === 'STATUS_FINAL';
}

export function isMatchUpcoming(status: string): boolean {
  return status === 'STATUS_SCHEDULED';
}
