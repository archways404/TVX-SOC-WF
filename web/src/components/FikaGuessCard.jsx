import { useEffect, useState } from 'react';
import { Coffee, Timer } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
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

// 93 minutes -> "1h 33m", 2 days -> "2d 0h" — coarse on purpose, it ticks every 30s.
function formatCountdown(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return minutes > 0 ? `${minutes}m` : 'less than a minute';
}

function WindowDescription({ event, now }) {
  const opensAt = new Date(event.opensAt);
  const closesAt = new Date(event.closesAt);

  if (event.isOpen) {
    return (
      <span className="flex items-center gap-1.5">
        <Timer className="h-3.5 w-3.5" />
        Closes in <span className="font-semibold text-foreground">{formatCountdown(closesAt - now)}</span>
        <span className="text-muted-foreground">({formatTime(event.closesAt)})</span>
      </span>
    );
  }
  if (now < opensAt) {
    return (
      <span>
        Opens in {formatCountdown(opensAt - now)} · {formatTime(event.opensAt)} – {formatTime(event.closesAt)}
      </span>
    );
  }
  return <span>Guessing window: {formatTime(event.opensAt)} – {formatTime(event.closesAt)}</span>;
}

export function FikaGuessCard({ event, error: loadError, now, onEventChange }) {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
      onEventChange(updated);
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
          <Coffee className={cn('h-4 w-4', !loadError && 'animate-pulse')} />
          {loadError ? `Couldn't load this week's fika: ${loadError}` : "Loading this week's fika…"}
        </CardContent>
      </Card>
    );
  }

  const live = event.isOpen;

  return (
    <Card className={cn(live && 'border-success/50 bg-success/5 shadow-lg ring-1 ring-success/30')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className={cn('text-primary', live ? 'h-5 w-5' : 'h-4 w-4')} />
            <CardTitle className={cn(live && 'text-2xl')}>{live ? 'Fika is live — get your guess in!' : "This week's fika"}</CardTitle>
          </div>
          {live ? (
            <Badge variant="success" className="gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              Live
            </Badge>
          ) : (
            <Badge variant="secondary">Closed</Badge>
          )}
        </div>
        <CardDescription>
          <WindowDescription event={event} now={now} />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.reveal && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Revealed answer</p>
            <p className="text-muted-foreground">{event.reveal.actualDescription}</p>
          </div>
        )}

        {live ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
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
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting}>
                {event.myGuess ? 'Update guess' : 'Submit guess'}
              </Button>
              {event.myGuess && (
                <span className="text-sm text-muted-foreground">Saved — you can change it until the window closes.</span>
              )}
            </div>
          </form>
        ) : event.myGuess ? (
          <div className="text-sm">
            <p className="text-muted-foreground">Your guess:</p>
            <p className="font-medium">{event.myGuess.description}</p>
            {event.myGuess.pointsAwarded !== null && (
              <p className="mt-1 text-muted-foreground">Points awarded: {event.myGuess.pointsAwarded}</p>
            )}
          </div>
        ) : now >= new Date(event.closesAt) ? (
          <p className="text-sm text-muted-foreground">Guessing has closed for this week — next round opens Friday at 08:00.</p>
        ) : (
          <p className="text-sm text-muted-foreground">Guessing isn't open yet — check back Friday at 08:00.</p>
        )}
      </CardContent>
    </Card>
  );
}
