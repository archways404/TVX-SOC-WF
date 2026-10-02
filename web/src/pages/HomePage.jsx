import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useNow } from '@/lib/useNow';
import { FikaGuessCard } from '@/components/FikaGuessCard';
import { Leaderboard } from '@/components/Leaderboard';

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

  // A tab left open from Thursday should switch to the live layout at 08:00
  // on its own — refetch once the clock crosses the window boundary.
  const boundaryPassed = event !== null && event.isOpen !== isWindowOpen(event, now);
  useEffect(() => {
    if (boundaryPassed) load();
  }, [boundaryPassed, load]);

  const card = <FikaGuessCard event={event} error={error} now={now} onEventChange={setEvent} />;

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
