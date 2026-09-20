import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const MEDAL_STYLES = [
  'bg-amber-400/20 text-amber-500',
  'bg-slate-400/20 text-slate-400',
  'bg-orange-400/20 text-orange-500',
];

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <CardTitle>Leaderboard</CardTitle>
        </div>
        <CardDescription>Top fika guessers, all time.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && rows === null && <p className="text-sm text-muted-foreground">Loading standings…</p>}
        {rows?.length === 0 && <p className="text-sm text-muted-foreground">No guesses yet — be the first!</p>}
        {rows?.length > 0 && (
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
              {rows.map((row) => (
                <TableRow key={row.userId} className={row.userId === user?.id ? 'bg-accent/50' : undefined}>
                  <TableCell>
                    {row.rank <= 3 ? (
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                          MEDAL_STYLES[row.rank - 1],
                        )}
                      >
                        {row.rank}
                      </span>
                    ) : (
                      <span className="pl-1.5 text-muted-foreground">{row.rank}</span>
                    )}
                  </TableCell>
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
