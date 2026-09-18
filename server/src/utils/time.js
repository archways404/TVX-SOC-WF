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
 * Resolves the fika event that "now" should be shown: the current week's
 * Friday while its window hasn't closed yet, otherwise next week's Friday.
 */
export function resolveCurrentEventDate(now = new Date()) {
  let friday = stockholmFridayOfWeek(now);
  let { opensAt, closesAt } = windowFor(friday);
  const nowDt = DateTime.fromJSDate(now, { zone: 'utc' });

  if (nowDt >= closesAt) {
    friday = friday.plus({ weeks: 1 });
    ({ opensAt, closesAt } = windowFor(friday));
  }

  return {
    eventDate: friday.toISODate(),
    opensAt: opensAt.toUTC().toJSDate(),
    closesAt: closesAt.toUTC().toJSDate(),
  };
}

export function isWithinWindow(now, opensAt, closesAt) {
  return now >= opensAt && now < closesAt;
}
