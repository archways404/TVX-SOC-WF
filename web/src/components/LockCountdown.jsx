import { useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNow } from '@/lib/useNow';

const URGENT_MS = 5 * 60_000;

function pad(n) {
  return String(n).padStart(2, '0');
}

function Segment({ value, label }) {
  return (
    <span className="flex flex-col items-center">
      <span className="min-w-[2.75rem] rounded-md bg-background/80 px-2 py-1 text-center font-mono text-2xl font-bold tabular-nums shadow-sm ring-1 ring-border sm:text-3xl">
        {pad(value)}
      </span>
      <span className="mt-1 text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</span>
    </span>
  );
}

/**
 * Ticks every second down to `target`, turning red in the last five minutes.
 * Owns its own 1s timer so only this component re-renders each tick, and
 * calls `onElapsed` once at zero so the page can refetch and lock the form
 * immediately instead of waiting for the next background poll.
 */
export function LockCountdown({ target, onElapsed }) {
  const now = useNow(1000);
  const remainingMs = Math.max(0, new Date(target) - now);
  const firedFor = useRef(null);

  useEffect(() => {
    if (remainingMs === 0 && firedFor.current !== target) {
      firedFor.current = target;
      onElapsed?.();
    }
  }, [remainingMs, target, onElapsed]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const urgent = remainingMs < URGENT_MS;

  return (
    <div
      role="timer"
      aria-label={`Answers lock in ${hours} hours ${minutes} minutes ${seconds} seconds`}
      className={cn('flex flex-col items-start gap-1.5 sm:items-end', urgent && 'text-destructive')}
    >
      <span className={cn('flex items-center gap-1.5 text-xs font-medium', urgent ? 'text-destructive' : 'text-muted-foreground')}>
        <Lock className="h-3.5 w-3.5" />
        Answers lock in
      </span>
      <span className={cn('flex items-start gap-1.5', urgent && 'animate-pulse')}>
        {hours > 0 && <Segment value={hours} label="hrs" />}
        <Segment value={minutes} label="min" />
        <Segment value={seconds} label="sec" />
      </span>
    </div>
  );
}
