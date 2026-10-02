import { findOrCreateCurrentEvent } from './fikaService.js';

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Makes sure this week's fika event exists without waiting for a player to
 * open the app. Runs once at boot and then every 15 minutes, so a new week's
 * event shows up on /admin shortly after Monday 00:00 Stockholm and Friday's
 * window opens on time even if nobody visited during the week.
 * Idempotent — creating an event that already exists is a no-op.
 */
export function startFikaScheduler(log) {
  const ensureCurrentEvent = async () => {
    try {
      const event = await findOrCreateCurrentEvent();
      log.debug({ eventId: event.id, eventDate: event.event_date }, 'Fika scheduler: current event ensured');
    } catch (err) {
      log.error(err, 'Fika scheduler: failed to ensure current event');
    }
  };

  ensureCurrentEvent();
  const timer = setInterval(ensureCurrentEvent, CHECK_INTERVAL_MS);
  timer.unref();
}
