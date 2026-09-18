import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function EventList({ events, selectedId, onSelect }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => onSelect(event.id)}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent ${
              event.id === selectedId ? 'bg-accent' : ''
            }`}
          >
            <span>{event.event_date}</span>
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">{event.guess_count} guesses</span>
              <Badge variant="secondary">{event.status}</Badge>
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function RevealForm({ event, categories, onRevealed }) {
  const [actualCategoryId, setActualCategoryId] = useState(event.actual_category_id ?? '');
  const [actualDescription, setActualDescription] = useState(event.actual_description ?? '');
  const [pointsCategory, setPointsCategory] = useState(event.points_category);
  const [pointsDescription, setPointsDescription] = useState(event.points_description);
  const [saving, setSaving] = useState(false);

  async function handleReveal(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put(`/api/admin/events/${event.id}/reveal`, {
        actualCategoryId: actualCategoryId ? Number(actualCategoryId) : null,
        actualDescription,
        pointsCategory: Number(pointsCategory),
        pointsDescription: Number(pointsDescription),
      });
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
      <Button type="submit" disabled={saving} className="sm:col-span-2">
        {event.status === 'awaiting_reveal' ? 'Reveal & auto-grade categories' : 'Update reveal'}
      </Button>
    </form>
  );
}

function GuessRow({ eventId, guess, onGraded }) {
  const [descriptionCorrect, setDescriptionCorrect] = useState(Boolean(guess.description_correct));
  const [categoryCorrect, setCategoryCorrect] = useState(Boolean(guess.category_correct));

  async function grade(next) {
    const updated = await api.put(`/api/admin/events/${eventId}/guesses/${guess.id}`, next);
    onGraded(updated);
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{guess.user_name}</TableCell>
      <TableCell>{guess.category_label ?? '—'}</TableCell>
      <TableCell>{guess.description}</TableCell>
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
      <TableCell className="text-right">{guess.points_awarded}</TableCell>
    </TableRow>
  );
}

export function AdminPage() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const refreshEvents = () => api.get('/api/admin/events').then(setEvents);

  useEffect(() => {
    refreshEvents();
    api.get('/api/fika/categories').then(setCategories);
  }, []);

  useEffect(() => {
    if (selectedId) {
      api.get(`/api/admin/events/${selectedId}`).then(setSelected);
    }
  }, [selectedId]);

  function applyUpdate(updated) {
    setSelected(updated);
    refreshEvents();
  }

  async function handleFinalize() {
    const updated = await api.post(`/api/admin/events/${selected.event.id}/finalize`, {});
    applyUpdate(updated);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <EventList events={events} selectedId={selectedId} onSelect={setSelectedId} />

      {selected ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reveal — {selected.event.event_date}</CardTitle>
            </CardHeader>
            <CardContent>
              <RevealForm event={selected.event} categories={categories} onRevealed={applyUpdate} />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.guesses.map((guess) => (
                    <GuessRow key={guess.id} eventId={selected.event.id} guess={guess} onGraded={applyUpdate} />
                  ))}
                </TableBody>
              </Table>
              {selected.event.status !== 'scored' && (
                <Button className="mt-4" variant="secondary" onClick={handleFinalize}>
                  Finalize scoring
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Pick an event to grade it.</p>
      )}
    </div>
  );
}
