import { DateTime } from 'luxon';
import { env } from '../config/env.js';

const ZONE = 'Europe/Stockholm';

function stockholmFridayOfWeek(now) {
  const nowStockholm = DateTime.fromJSDate(now, { zone: 'utc' }).setZone(ZONE);
  const monday = nowStockholm.startOf('week');
  return monday.plus({ days: 4 }).startOf('day');
}

function windowFor(fridayStockholmMidnight) {
  const opensAt = fridayStockholmMidnight.set({ hour: 8, minute: 0, second: 0, millisecond: 0 });
  const closesAt = opensAt.plus({ minutes: env.fikaGuessWindowMinutes });
  return { opensAt, closesAt };
}

/**
 * Resolves the fika event that "now" belongs to: the Friday of the current
 * Stockholm week (Monday–Sunday). It deliberately does not roll over to next
 * week once the window closes — this Friday's event stays current through the
 * weekend so players can still see their guess and the reveal, and the admin
 * always has that Friday's event to grade.
 */
export function resolveCurrentEventDate(now = new Date()) {
  const friday = stockholmFridayOfWeek(now);
  const { opensAt, closesAt } = windowFor(friday);

  return {
    eventDate: friday.toISODate(),
    opensAt: opensAt.toUTC().toJSDate(),
    closesAt: closesAt.toUTC().toJSDate(),
  };
}

export function isWithinWindow(now, opensAt, closesAt) {
  return now >= opensAt && now < closesAt;
}
