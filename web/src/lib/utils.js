import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// "Philip Stenberg" -> "Philip S" — used wherever we greet the signed-in user.
export function formatShortName(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}`;
}

// event_date comes back from the API as a MySQL DATE serialized to JSON, so
// either "2026-08-14" or a full "2026-08-14T00:00:00.000Z" instant — both
// represent a calendar date, not a moment, so parse with UTC getters only.
function toUtcDate(eventDate) {
  const isoDatePart = String(eventDate).slice(0, 10);
  const [year, month, day] = isoDatePart.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// ISO 8601 week number (weeks start Monday, week 1 contains the year's first Thursday).
export function getIsoWeek(eventDate) {
  const date = toUtcDate(eventDate);
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

// -> "Week 33 · Aug 14, 2026" — used anywhere a fika event/round is listed.
export function formatEventWeek(eventDate) {
  const date = toUtcDate(eventDate);
  const dateLabel = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `Week ${getIsoWeek(eventDate)} · ${dateLabel}`;
}
