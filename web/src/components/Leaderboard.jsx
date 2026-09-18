import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';

export function Leaderboard() {
  const [rows, setRows] = useState([]);
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
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
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
                <TableCell>{row.rank}</TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right">{row.totalPoints}</TableCell>
                <TableCell className="text-right text-muted-foreground">{row.guessesMade}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
