import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useNow } from '@/lib/useNow';
import { FikaGuessCard } from '@/components/FikaGuessCard';
import { Leaderboard } from '@/components/Leaderboard';

const LIVE_REFRESH_MS = 20_000;

function isWindowOpen(event, now) {
  return now >= new Date(event.opensAt) && now < new Date(event.closesAt);
}

export function HomePage() {
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const now = useNow();

  const load = useCallback(
    () =>
      api
        .get('/api/fika/current')
        .then(setEvent)
        .catch((err) => setError(err.message)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // While guessing is open, keep everyone's picks and guesses fresh so the
  // category cards and the guess list update as people lock in.
  const live = event?.isOpen ?? false;
  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(load, LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [live, load]);

  // A tab left open from Thursday should switch to the live layout at 08:00
  // on its own — refetch once the clock crosses the window boundary.
  const boundaryPassed = event !== null && event.isOpen !== isWindowOpen(event, now);
  useEffect(() => {
    if (boundaryPassed) load();
  }, [boundaryPassed, load]);

  const card = (
    <FikaGuessCard event={event} error={error} now={now} onEventChange={setEvent} onWindowElapsed={load} />
  );

  // While guessing is open the round is the whole point of the page: give it
  // the full width up top instead of sharing a column with the leaderboard.
  if (event?.isOpen) {
    return (
      <div className="space-y-6">
        {card}
        <Leaderboard />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      {card}
      <Leaderboard />
    </div>
  );
}
