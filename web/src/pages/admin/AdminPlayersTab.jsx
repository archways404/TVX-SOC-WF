import { useEffect, useState } from 'react';
import { Trash2, PlusCircle, MinusCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

function AdjustmentForm({ users, onAdded }) {
  const [userId, setUserId] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userId || points === '') return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/api/admin/score-adjustments', { userId: Number(userId), points: Number(points), reason });
      onAdded();
      setUserId('');
      setPoints('');
      setReason('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_8rem_2fr_auto] sm:items-end">
      <div className="space-y-1.5">
        <Label>Player</Label>
        <Select value={userId} onChange={(e) => setUserId(e.target.value)} required>
          <option value="">Pick a player…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Points (+/-)</Label>
        <Input type="number" placeholder="e.g. 5 or -3" value={points} onChange={(e) => setPoints(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Reason (optional)</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this adjustment?" />
      </div>
      <Button type="submit" disabled={saving || !userId || points === ''}>
        Apply
      </Button>
      {error && <p className="text-sm text-destructive sm:col-span-4">{error}</p>}
    </form>
  );
}

function AdjustmentRow({ adjustment, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const positive = adjustment.points >= 0;

  async function handleDelete() {
    setBusy(true);
    try {
      await api.del(`/api/admin/score-adjustments/${adjustment.id}`);
      onDeleted();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{adjustment.user_name}</TableCell>
      <TableCell>
        <span className={cn('inline-flex items-center gap-1 font-semibold', positive ? 'text-success' : 'text-destructive')}>
          {positive ? <PlusCircle className="h-3.5 w-3.5" /> : <MinusCircle className="h-3.5 w-3.5" />}
          {positive ? '+' : ''}
          {adjustment.points}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">{adjustment.reason ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{adjustment.created_by_name ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{new Date(adjustment.created_at).toLocaleDateString()}</TableCell>
      <TableCell className="text-right">
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(true)}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
        <ConfirmDialog
          open={confirming}
          title="Undo this adjustment?"
          description={`Removes the ${positive ? '+' : ''}${adjustment.points} point adjustment for ${adjustment.user_name}.`}
          confirmLabel="Undo"
          variant="destructive"
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      </TableCell>
    </TableRow>
  );
}

export function AdminPlayersTab() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [users, setUsers] = useState([]);
  const [adjustments, setAdjustments] = useState([]);

  const refresh = () => {
    api.get('/api/leaderboard').then(setLeaderboard);
    api.get('/api/admin/score-adjustments').then(setAdjustments);
  };

  useEffect(() => {
    refresh();
    api.get('/api/admin/users').then(setUsers);
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add a score adjustment</CardTitle>
          <CardDescription>
            Grant or deduct points for any registered player, independent of any weekly event — bonuses, corrections,
            or crediting someone who never played.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdjustmentForm users={users} onAdded={refresh} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Standings</CardTitle>
            <CardDescription>Current total points per player (guesses + adjustments).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Guesses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right font-semibold">{row.totalPoints}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.guessesMade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {leaderboard.length === 0 && <p className="py-4 text-sm text-muted-foreground">No players yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adjustment history</CardTitle>
            <CardDescription>Every manual grant/deduction, most recent first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Undo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((a) => (
                  <AdjustmentRow key={a.id} adjustment={a} onDeleted={refresh} />
                ))}
              </TableBody>
            </Table>
            {adjustments.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">No manual adjustments yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
