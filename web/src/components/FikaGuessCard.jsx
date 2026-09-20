import { useEffect, useState } from 'react';
import { Coffee } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

function formatTime(iso) {
  return new Date(iso).toLocaleString('en-SE', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FikaGuessCard() {
  const [event, setEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get('/api/fika/current').then(setEvent);

  useEffect(() => {
    load().catch((err) => setError(err.message));
    api.get('/api/fika/categories').then(setCategories);
  }, []);

  useEffect(() => {
    if (event?.myGuess) {
      setCategoryId(event.myGuess.categoryId ?? '');
      setDescription(event.myGuess.description ?? '');
    }
  }, [event]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const updated = await api.post('/api/fika/current/guess', {
        categoryId: categoryId ? Number(categoryId) : null,
        description,
      });
      setEvent(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!event) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Coffee className="h-4 w-4 animate-pulse" />
          Loading this week's fika…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-primary" />
            <CardTitle>This week's fika</CardTitle>
          </div>
          <Badge variant={event.isOpen ? 'success' : 'secondary'}>{event.isOpen ? 'Open' : 'Closed'}</Badge>
        </div>
        <CardDescription>
          Guessing window: {formatTime(event.opensAt)} – {formatTime(event.closesAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.reveal && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Revealed answer</p>
            <p className="text-muted-foreground">{event.reveal.actualDescription}</p>
          </div>
        )}

        {event.isOpen ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Type of fika</Label>
              <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Pick one…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Full guess</Label>
              <Input
                id="description"
                placeholder='e.g. "Cinnamon buns"'
                value={description}
                maxLength={255}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {event.myGuess ? 'Update guess' : 'Submit guess'}
            </Button>
          </form>
        ) : event.myGuess ? (
          <div className="text-sm">
            <p className="text-muted-foreground">Your guess:</p>
            <p className="font-medium">{event.myGuess.description}</p>
            {event.myGuess.pointsAwarded !== null && (
              <p className="mt-1 text-muted-foreground">Points awarded: {event.myGuess.pointsAwarded}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Guessing isn't open yet — check back Friday at 08:00.</p>
        )}
      </CardContent>
    </Card>
  );
}
