import { useEffect, useState } from 'react';
import { Crown, Medal, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const PODIUM_STYLE = {
  1: {
    icon: Crown,
    order: 'order-2',
    ring: 'ring-amber-400/70',
    badge: 'bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950',
    base: 'h-28 bg-gradient-to-t from-amber-400/25 to-amber-400/5 sm:h-36',
    label: 'text-amber-500',
  },
  2: {
    icon: Medal,
    order: 'order-1',
    ring: 'ring-slate-300/70',
    badge: 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-900',
    base: 'h-20 bg-gradient-to-t from-slate-400/25 to-slate-400/5 sm:h-24',
    label: 'text-slate-400',
  },
  3: {
    icon: Medal,
    order: 'order-3',
    ring: 'ring-orange-400/70',
    badge: 'bg-gradient-to-b from-orange-300 to-orange-500 text-orange-950',
    base: 'h-14 bg-gradient-to-t from-orange-400/25 to-orange-400/5 sm:h-16',
    label: 'text-orange-500',
  },
};

function PodiumSpot({ row, place }) {
  const style = PODIUM_STYLE[place];
  const Icon = style.icon;

  if (!row) {
    return <div className={cn('flex-1', style.order)} />;
  }

  return (
    <div className={cn('flex flex-1 flex-col items-center gap-2', style.order)}>
      <Icon className={cn('h-5 w-5', style.label)} />
      <div
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ring-4 ring-offset-2 ring-offset-background sm:h-16 sm:w-16 sm:text-xl',
          style.badge,
          style.ring,
        )}
      >
        {row.name.charAt(0).toUpperCase()}
      </div>
      <div className="max-w-[6rem] text-center sm:max-w-[8rem]">
        <p className="truncate text-sm font-semibold sm:text-base">{row.name}</p>
        <p className="text-xs text-muted-foreground sm:text-sm">{row.totalPoints} pts</p>
      </div>
      <div
        className={cn(
          'flex w-16 items-start justify-center rounded-t-lg border-x border-t border-border/60 pt-1.5 text-base font-bold text-muted-foreground sm:w-24 sm:text-lg',
          style.base,
        )}
      >
        {place}
      </div>
    </div>
  );
}

function Podium({ rows }) {
  const [first, second, third] = rows;
  return (
    <div className="flex items-end justify-center gap-3 pt-2 sm:gap-6">
      <PodiumSpot row={second} place={2} />
      <PodiumSpot row={first} place={1} />
      <PodiumSpot row={third} place={3} />
    </div>
  );
}

export function Leaderboard() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    api
      .get('/api/leaderboard')
      .then(setRows)
      .catch((err) => setError(err.message));
  }, []);

  const rest = rows?.slice(3) ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <CardTitle>Leaderboard</CardTitle>
        </div>
        <CardDescription>Top fika guessers, all time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && rows === null && <p className="text-sm text-muted-foreground">Loading standings…</p>}
        {rows?.length === 0 && <p className="text-sm text-muted-foreground">No guesses yet — be the first!</p>}

        {rows?.length > 0 && <Podium rows={rows.slice(0, 3)} />}

        {rest.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-right">Guesses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rest.map((row) => (
                <TableRow key={row.userId} className={row.userId === user?.id ? 'bg-accent/50' : undefined}>
                  <TableCell className="pl-4 text-muted-foreground">{row.rank}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right font-semibold">{row.totalPoints}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{row.guessesMade}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
