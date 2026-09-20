import { useEffect, useMemo, useState } from 'react';
import { Crown, Medal, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const CONFETTI_COLORS = ['#facc15', '#22c55e', '#f97316', '#e2e8f0', '#34d399'];
const REFRESH_MS = 60_000;

function initial(name) {
  return name?.charAt(0).toUpperCase() ?? '?';
}

// Confetti only rains on 1st place — randomized once per mount so it doesn't
// re-shuffle on every background leaderboard refresh.
function useConfetti(count = 22) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: 1.6 + Math.random() * 0.6,
        duration: 1.1 + Math.random() * 0.9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 5,
        rotate: Math.random() * 360,
      })),
    [count],
  );
}

function ChampionSpot({ row }) {
  const confetti = useConfetti();
  if (!row) return <div className="flex-1" />;

  return (
    <div className="animate-podium-1 relative flex flex-1 flex-col items-center gap-3">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden">
        {confetti.map((p) => (
          <span
            key={p.id}
            className="animate-confetti absolute top-0 block rounded-sm"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.4,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              transform: `rotate(${p.rotate}deg)`,
            }}
          />
        ))}
      </div>
      <Crown className="h-8 w-8 text-amber-400" />
      <div className="animate-champion-glow flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-4xl font-bold text-amber-950 ring-4 ring-amber-300/70 ring-offset-4 ring-offset-background sm:h-36 sm:w-36">
        {initial(row.name)}
      </div>
      <div className="text-center">
        <p className="text-xl font-bold sm:text-2xl">{row.name}</p>
        <p className="text-lg font-semibold text-primary">{row.totalPoints} pts</p>
      </div>
    </div>
  );
}

// 2nd place is still a big deal (large medallion, own rise-in); 3rd is
// deliberately modest — smaller, muted, no glow — so it registers without
// competing with the top two.
function RunnerUpSpot({ row, place }) {
  if (!row) return <div className="flex-1" />;

  const isSecond = place === 2;
  const anim = isSecond ? 'animate-podium-2' : 'animate-podium-3';
  const ring = isSecond ? 'ring-slate-300/70' : 'ring-orange-400/40';
  const badge = isSecond
    ? 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-900'
    : 'bg-gradient-to-b from-orange-300/70 to-orange-500/70 text-orange-950';
  const size = isSecond ? 'h-24 w-24 text-2xl sm:h-28 sm:w-28' : 'h-16 w-16 text-lg sm:h-20 sm:w-20';
  const nameClass = isSecond ? 'text-lg font-semibold' : 'text-sm font-medium text-muted-foreground';

  return (
    <div className={cn('flex flex-1 flex-col items-center gap-2', anim)}>
      <Medal className={cn('h-5 w-5', isSecond ? 'text-slate-300' : 'text-orange-400/70')} />
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-bold ring-2 ring-offset-2 ring-offset-background',
          badge,
          ring,
          size,
        )}
      >
        {initial(row.name)}
      </div>
      <div className="text-center">
        <p className={nameClass}>{row.name}</p>
        <p className="text-sm text-muted-foreground">{row.totalPoints} pts</p>
      </div>
    </div>
  );
}

export function ScoreboardPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = () => api.get('/api/leaderboard').then(setRows).catch((err) => setError(err.message));
    load();
    // Quiet background refresh for a screen left open on a wall/TV — state
    // updates in place so the entrance animations (mount-only) don't replay.
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <p className="text-center text-sm text-destructive">{error}</p>;
  }
  if (!rows) {
    return <p className="text-center text-sm text-muted-foreground">Loading scoreboard…</p>;
  }
  if (rows.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">No guesses yet — nobody on the board.</p>;
  }

  const [first, second, third] = rows;
  const rest = rows.slice(3);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Scoreboard</h1>
      </div>

      <div className="flex items-end justify-center gap-4 pt-6 sm:gap-10">
        <RunnerUpSpot row={second} place={2} />
        <ChampionSpot row={first} />
        <RunnerUpSpot row={third} place={3} />
      </div>

      {rest.length > 0 && (
        <div className="animate-rest mx-auto max-w-md space-y-1">
          {rest.map((row) => (
            <div
              key={row.userId}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent/40"
            >
              <span className="flex items-center gap-3">
                <span className="w-5 text-muted-foreground">{row.rank}</span>
                <span>{row.name}</span>
              </span>
              <span className="text-muted-foreground">{row.totalPoints} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
