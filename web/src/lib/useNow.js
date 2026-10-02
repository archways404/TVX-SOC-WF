import { useEffect, useState } from 'react';

// Re-renders the caller every `intervalMs` with a fresh Date — for countdowns
// and for noticing when a guessing window opens or closes while the page is open.
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
