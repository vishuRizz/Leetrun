/**
 * App "day" helpers.
 *
 * Quests rotate and streaks count by calendar day. Server time on most hosts
 * (e.g. Vercel) is UTC, so a naive `new Date().setHours(0,0,0,0)` puts the day
 * boundary at 00:00 UTC — which is 05:30 in India. Our audience is largely IST,
 * so we anchor the "day" to a configurable timezone offset (defaults to IST,
 * +330 minutes) and override it with APP_TZ_OFFSET_MINUTES if needed.
 */
const APP_TZ_OFFSET_MINUTES = Number(
  process.env.APP_TZ_OFFSET_MINUTES ?? 330
);

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** UTC instant corresponding to midnight of the given date in the app timezone. */
export function startOfAppDay(date: Date = new Date()): Date {
  const shifted = new Date(date.getTime() + APP_TZ_OFFSET_MINUTES * MS_PER_MINUTE);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - APP_TZ_OFFSET_MINUTES * MS_PER_MINUTE);
}

/** Start of the previous app day. */
export function startOfPreviousAppDay(date: Date = new Date()): Date {
  return startOfAppDay(new Date(startOfAppDay(date).getTime() - 1));
}

/** Stable YYYY-MM-DD key for the app day a date falls in (app timezone). */
export function appDayKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + APP_TZ_OFFSET_MINUTES * MS_PER_MINUTE);
  return shifted.toISOString().slice(0, 10);
}

export { MS_PER_DAY };
