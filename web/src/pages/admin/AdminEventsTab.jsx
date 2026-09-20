import { useEffect, useState } from 'react';
import {
  Sparkles,
  Pencil,
  Trash2,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Circle,
  UserCheck,
  Check,
  X,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn, formatEventWeek } from '@/lib/utils';

const STATUS_BADGE = {
  awaiting_reveal: { variant: 'outline', label: 'Awaiting reveal' },
  revealed: { variant: 'secondary', label: 'Revealed' },
  scored: { variant: 'success', label: 'Scored' },
};

const GRADED_BY_META = {
  pending: { label: 'Pending', icon: Circle, className: 'text-muted-foreground' },
  auto: { label: 'Auto', icon: CheckCircle2, className: 'border-transparent bg-secondary text-secondary-foreground' },
  ai: { label: 'AI', icon: Sparkles, className: 'border-primary/40 text-primary' },
  admin: { label: 'Admin', icon: UserCheck, className: 'border-transparent bg-secondary text-secondary-foreground' },
};

function StatusBadge({ status }) {
  const meta = STATUS_BADGE[status] ?? { variant: 'outline', label: status };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function EventList({ events, selectedId, onSelect }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {events.length === 0 && <p className="text-sm text-muted-foreground">No fika events yet.</p>}
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => onSelect(event.id)}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
              event.id === selectedId && 'bg-accent',
            )}
          >
            <span className="font-medium">{formatEventWeek(event.event_date)}</span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-muted-foreground">{event.guess_count}</span>
              <StatusBadge status={event.status} />
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

// Not just a hover tooltip — the raw callback body n8n posted is shown in
// full so an admin can see exactly what the AI decided and why, not a
// truncated summary.
function AiGradingPanel({ event, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  if (event.status === 'awaiting_reveal') return null;

  async function handleRequest() {
    setLoading(true);
    setError(null);
    try {
      const updated = await api.post(`/api/admin/events/${event.id}/request-ai-grading`, {});
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          {event.ai_graded_at ? (
            <span>AI grading applied — review below and finalize when ready.</span>
          ) : event.ai_requested_at ? (
            <span>Sent to n8n for grading — waiting for results to be posted back.</span>
          ) : (
            <span>Not sent to n8n yet. Description correctness is free text, so an AI pass can pre-grade it.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-destructive">{error}</span>}
          {event.ai_raw_response && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Raw response
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={handleRequest}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {event.ai_requested_at ? 'Re-send to AI' : 'Send to AI for grading'}
          </Button>
        </div>
      </div>
      {showRaw && event.ai_raw_response && (
        <pre className="max-h-80 overflow-auto rounded-md bg-background p-3 text-xs text-foreground">
          {JSON.stringify(event.ai_raw_response, null, 2)}
        </pre>
      )}
    </div>
  );
}

function RevealForm({ event, categories, onRevealed }) {
  const [actualCategoryId, setActualCategoryId] = useState(event.actual_category_id ?? '');
  const [actualDescription, setActualDescription] = useState(event.actual_description ?? '');
  const [pointsCategory, setPointsCategory] = useState(event.points_category);
  const [pointsDescription, setPointsDescription] = useState(event.points_description);
  const [saving, setSaving] = useState(false);
  const [aiNotice, setAiNotice] = useState(null);

  async function handleReveal(e) {
    e.preventDefault();
    setSaving(true);
    setAiNotice(null);
    try {
      const updated = await api.put(`/api/admin/events/${event.id}/reveal`, {
        actualCategoryId: actualCategoryId ? Number(actualCategoryId) : null,
        actualDescription,
        pointsCategory: Number(pointsCategory),
        pointsDescription: Number(pointsDescription),
      });
      if (updated.aiGrading && !updated.aiGrading.requested && updated.aiGrading.error) {
        setAiNotice(`AI grading wasn't sent: ${updated.aiGrading.error}`);
      } else if (updated.aiGrading?.requested) {
        setAiNotice('Sent to n8n for AI grading.');
      }
      onRevealed(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleReveal} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Actual category</Label>
        <Select value={actualCategoryId} onChange={(e) => setActualCategoryId(e.target.value)}>
          <option value="">None</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Actual description</Label>
        <Input value={actualDescription} onChange={(e) => setActualDescription(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Points for category</Label>
        <Input type="number" min="0" value={pointsCategory} onChange={(e) => setPointsCategory(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Points for full description</Label>
        <Input
          type="number"
          min="0"
          value={pointsDescription}
          onChange={(e) => setPointsDescription(e.target.value)}
        />
      </div>
      {aiNotice && <p className="text-xs text-muted-foreground sm:col-span-2">{aiNotice}</p>}
      <Button type="submit" disabled={saving} className="sm:col-span-2">
        {event.status === 'awaiting_reveal' ? 'Reveal & auto-grade categories' : 'Update reveal'}
      </Button>
    </form>
  );
}

function GuessRow({ eventId, guess, categories, onGraded }) {
  const [descriptionCorrect, setDescriptionCorrect] = useState(Boolean(guess.description_correct));
  const [categoryCorrect, setCategoryCorrect] = useState(Boolean(guess.category_correct));
  const [pointsInput, setPointsInput] = useState(String(guess.points_awarded));
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(guess.description);
  const [editCategoryId, setEditCategoryId] = useState(guess.category_id ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  // GuessRow keeps its own local state (checkboxes, points, edit fields) so
  // typing/toggling feels instant, but that means it won't pick up changes
  // made elsewhere — AI grading applied in bulk, another admin's edit — on
  // its own. Re-sync from the prop whenever the server's copy changes,
  // unless the admin is mid-edit of this exact row.
  useEffect(() => {
    setDescriptionCorrect(Boolean(guess.description_correct));
    setCategoryCorrect(Boolean(guess.category_correct));
    setPointsInput(String(guess.points_awarded));
    if (!editing) {
      setEditDescription(guess.description);
      setEditCategoryId(guess.category_id ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guess.description_correct, guess.category_correct, guess.points_awarded, guess.description, guess.category_id]);

  async function grade(next) {
    const updated = await api.put(`/api/admin/events/${eventId}/guesses/${guess.id}`, next);
    onGraded(updated);
  }

  async function handlePointsBlur() {
    const next = Number(pointsInput);
    if (Number.isNaN(next) || next === guess.points_awarded) {
      setPointsInput(String(guess.points_awarded));
      return;
    }
    await grade({ categoryCorrect, descriptionCorrect, pointsOverride: next });
  }

  async function handleSaveEdit() {
    setBusy(true);
    try {
      const updated = await api.patch(`/api/admin/events/${eventId}/guesses/${guess.id}`, {
        categoryId: editCategoryId ? Number(editCategoryId) : null,
        description: editDescription,
      });
      onGraded(updated);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const updated = await api.del(`/api/admin/events/${eventId}/guesses/${guess.id}`);
      onGraded(updated);
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  const gradedMeta = GRADED_BY_META[guess.graded_by] ?? GRADED_BY_META.pending;
  const GradedIcon = gradedMeta.icon;

  return (
    <TableRow>
      <TableCell className="font-medium">{guess.user_name}</TableCell>
      <TableCell>
        {editing ? (
          <Select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)} className="h-9 min-w-[9rem]">
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        ) : (
          guess.category_label ?? '—'
        )}
      </TableCell>
      <TableCell className="max-w-[16rem]">
        {editing ? (
          <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="h-9" />
        ) : (
          <div>
            <span>{guess.description}</span>
            {/* Full AI reasoning, always visible — not hidden behind a hover tooltip. */}
            {guess.ai_notes && <p className="mt-1 text-xs italic text-muted-foreground">{guess.ai_notes}</p>}
          </div>
        )}
      </TableCell>
      <TableCell>
        <input
          type="checkbox"
          checked={categoryCorrect}
          onChange={(e) => {
            setCategoryCorrect(e.target.checked);
            grade({ categoryCorrect: e.target.checked, descriptionCorrect });
          }}
        />
      </TableCell>
      <TableCell>
        <input
          type="checkbox"
          checked={descriptionCorrect}
          onChange={(e) => {
            setDescriptionCorrect(e.target.checked);
            grade({ categoryCorrect, descriptionCorrect: e.target.checked });
          }}
        />
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          min="0"
          value={pointsInput}
          onChange={(e) => setPointsInput(e.target.value)}
          onBlur={handlePointsBlur}
          className="h-9 w-16 text-right"
        />
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('gap-1', gradedMeta.className)}>
          <GradedIcon className="h-3 w-3" />
          {gradedMeta.label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {editing ? (
            <>
              <Button type="button" variant="success" size="sm" disabled={busy} onClick={handleSaveEdit}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </>
          )}
        </div>
        <ConfirmDialog
          open={confirmingDelete}
          title="Delete this guess?"
          description={`${guess.user_name}'s guess will be permanently removed and won't count toward their score.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      </TableCell>
    </TableRow>
  );
}

/**
 * Lets an admin credit someone who never submitted a guess — they forgot to
 * play, joined late, or just deserve a manual bonus. Creates a bare guess
 * row for them; the normal GuessRow controls (checkboxes, points, edit)
 * take over from there.
 */
function AddPlayerForm({ eventId, eligibleUsers, onAdded }) {
  const [userId, setUserId] = useState('');
  const [points, setPoints] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (eligibleUsers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Every registered player already has a guess for this event.</p>
    );
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.post(`/api/admin/events/${eventId}/guesses`, {
        userId: Number(userId),
        pointsOverride: points === '' ? 0 : Number(points),
      });
      onAdded(updated);
      setUserId('');
      setPoints('0');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border p-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Player without a guess</Label>
        <Select value={userId} onChange={(e) => setUserId(e.target.value)} className="h-9 min-w-[10rem]" required>
          <option value="">Pick a player…</option>
          {eligibleUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Points to award</Label>
        <Input
          type="number"
          min="0"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          className="h-9 w-24"
        />
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button type="submit" size="sm" disabled={saving || !userId}>
        <UserPlus className="h-3.5 w-3.5" />
        Add player
      </Button>
    </form>
  );
}

export function AdminEventsTab() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);
  const [confirmingReopen, setConfirmingReopen] = useState(false);
  const [confirmingDeleteEvent, setConfirmingDeleteEvent] = useState(false);

  const refreshEvents = () => api.get('/api/admin/events').then(setEvents);

  useEffect(() => {
    refreshEvents();
    api.get('/api/fika/categories').then(setCategories);
    api.get('/api/admin/users').then(setUsers);
  }, []);

  useEffect(() => {
    if (selectedId) {
      api.get(`/api/admin/events/${selectedId}`).then(setSelected);
    } else {
      setSelected(null);
    }
  }, [selectedId]);

  function applyUpdate(updated) {
    setSelected(updated);
    refreshEvents();
  }

  async function handleFinalize() {
    const updated = await api.post(`/api/admin/events/${selected.event.id}/finalize`, {});
    applyUpdate(updated);
    setConfirmingFinalize(false);
  }

  async function handleReopen() {
    const updated = await api.post(`/api/admin/events/${selected.event.id}/reopen`, {});
    applyUpdate(updated);
    setConfirmingReopen(false);
  }

  async function handleDeleteEvent() {
    await api.del(`/api/admin/events/${selected.event.id}`);
    setConfirmingDeleteEvent(false);
    setSelectedId(null);
    refreshEvents();
  }

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <EventList events={events} selectedId={selectedId} onSelect={setSelectedId} />

      {selected ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Reveal — {formatEventWeek(selected.event.event_date)}</CardTitle>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.event.status} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDeleteEvent(true)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <RevealForm key={selected.event.id} event={selected.event} categories={categories} onRevealed={applyUpdate} />
              <AiGradingPanel event={selected.event} onUpdated={applyUpdate} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guesses ({selected.guesses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Guess</TableHead>
                    <TableHead>Category ✓</TableHead>
                    <TableHead>Description ✓</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead>Graded by</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.guesses.map((guess) => (
                    <GuessRow
                      key={guess.id}
                      eventId={selected.event.id}
                      guess={guess}
                      categories={categories}
                      onGraded={applyUpdate}
                    />
                  ))}
                </TableBody>
              </Table>
              {selected.guesses.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">No guesses for this event yet.</p>
              )}

              <div className="mt-4">
                <AddPlayerForm
                  eventId={selected.event.id}
                  eligibleUsers={users.filter((u) => !selected.guesses.some((g) => g.user_id === u.id))}
                  onAdded={applyUpdate}
                />
              </div>

              <div className="mt-4 flex gap-2">
                {selected.event.status !== 'scored' ? (
                  <Button variant="success" onClick={() => setConfirmingFinalize(true)}>
                    Finalize scoring
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setConfirmingReopen(true)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reopen for editing
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Pick an event to grade it.</p>
      )}

      {selected && (
        <>
          <ConfirmDialog
            open={confirmingFinalize}
            title="Finalize scoring?"
            description="Points become final and the leaderboard updates. You can still reopen this event later to correct mistakes."
            confirmLabel="Finalize"
            variant="success"
            onConfirm={handleFinalize}
            onCancel={() => setConfirmingFinalize(false)}
          />
          <ConfirmDialog
            open={confirmingReopen}
            title="Reopen this event?"
            description='Status goes back to "revealed" so you can keep correcting guesses before finalizing again.'
            confirmLabel="Reopen"
            variant="success"
            onConfirm={handleReopen}
            onCancel={() => setConfirmingReopen(false)}
          />
          <ConfirmDialog
            open={confirmingDeleteEvent}
            title="Delete this entire event?"
            description="This permanently removes the event and every guess submitted for it. This can't be undone."
            confirmLabel="Delete event"
            variant="destructive"
            onConfirm={handleDeleteEvent}
            onCancel={() => setConfirmingDeleteEvent(false)}
          />
        </>
      )}
    </div>
  );
}
