import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Coffee, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PlayerAvatar } from '@/components/ui/avatar';
import { LockCountdown } from '@/components/LockCountdown';

const MAX_STACKED_AVATARS = 5;

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

  // The live countdown itself is LockCountdown, next to this in the header.
  if (event.isOpen) {
    return <span>Answers lock at {formatTime(event.closesAt)}</span>;
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

function AvatarStack({ guesses }) {
  const shown = guesses.slice(0, MAX_STACKED_AVATARS);
  const hidden = guesses.slice(MAX_STACKED_AVATARS);

  return (
    <span className="flex -space-x-2">
      {shown.map((g) => (
        <PlayerAvatar key={g.userId} name={g.isMe ? `${g.userName} (you)` : g.userName} src={g.avatarUrl} />
      ))}
      {hidden.length > 0 && (
        <span
          title={hidden.map((g) => g.userName).join(', ')}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[0.65rem] font-semibold text-muted-foreground ring-2 ring-background"
        >
          +{hidden.length}
        </span>
      )}
    </span>
  );
}

// The category dropdown as a grid of cards, each showing who has currently
// picked that option — so players can follow (or dodge) the crowd.
function CategoryPicker({ categories, guesses, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((c) => {
        const selected = String(value) === String(c.id);
        const pickedBy = guesses.filter((g) => g.categoryId === c.id);
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={selected}
            // Clicking the selected card again clears it — category is optional.
            onClick={() => onChange(selected ? '' : c.id)}
            className={cn(
              'flex min-h-[5.5rem] flex-col justify-between gap-3 rounded-lg border bg-card p-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent/40',
              selected && 'border-primary bg-primary/10 ring-1 ring-primary hover:bg-primary/10',
            )}
          >
            <span className="flex items-start justify-between gap-2 font-medium">
              {c.label}
              {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </span>
            {pickedBy.length > 0 ? (
              <span className="flex items-center justify-between gap-2">
                <AvatarStack guesses={pickedBy} />
                <span className="text-xs text-muted-foreground">{pickedBy.length}</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No picks yet</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CorrectMark({ value, label }) {
  if (value === null) return null;
  const Icon = value ? CheckCircle2 : XCircle;
  return <Icon aria-label={`${label} ${value ? 'correct' : 'wrong'}`} className={cn('h-4 w-4', value ? 'text-success' : 'text-destructive/70')} />;
}

// Everyone's guess for this week, visible whether or not you've locked yours
// in. Correctness and points only appear once the admin has revealed.
function GuessesList({ guesses, revealed, wide }) {
  return (
    <div className="space-y-3 border-t border-border/60 pt-4">
      <p className="text-sm font-medium">
        {revealed ? "Everyone's guesses" : 'Guesses so far'}
        <span className="ml-1.5 text-muted-foreground">{guesses.length}</span>
      </p>
      {guesses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody has guessed yet — be the first!</p>
      ) : (
        <ul className={cn('grid gap-2', wide && 'md:grid-cols-2')}>
          {guesses.map((g) => (
            <li
              key={g.userId}
              className={cn(
                'flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5',
                g.isMe && 'border-primary/40 bg-primary/5',
              )}
            >
              <PlayerAvatar name={g.userName} src={g.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{g.isMe ? 'You' : g.userName}</p>
                <p className="truncate text-sm text-muted-foreground">“{g.description}”</p>
              </div>
              {g.categoryLabel && (
                <Badge variant="outline" className="shrink-0 gap-1">
                  {g.categoryLabel}
                  <CorrectMark value={g.categoryCorrect} label="Category" />
                </Badge>
              )}
              {revealed && (
                <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold">
                  <CorrectMark value={g.descriptionCorrect} label="Guess" />
                  {g.pointsAwarded} pts
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FikaGuessCard({ event, error: loadError, now, onEventChange, onWindowElapsed }) {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/api/fika/categories').then(setCategories);
  }, []);

  // Keyed on the saved guess, not the whole event: the event is re-polled
  // while guessing is open, and that must not wipe what you're typing.
  const savedCategoryId = event?.myGuess?.categoryId;
  const savedDescription = event?.myGuess?.description;
  useEffect(() => {
    if (savedDescription !== undefined) {
      setCategoryId(savedCategoryId ?? '');
      setDescription(savedDescription ?? '');
    }
  }, [savedCategoryId, savedDescription]);

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
  const guesses = event.guesses ?? [];
  const showGuesses = live || guesses.length > 0;

  return (
    <Card className={cn(live && 'border-success/50 bg-success/5 shadow-lg ring-1 ring-success/30')}>
      <CardHeader className="gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Coffee className={cn('text-primary', live ? 'h-5 w-5' : 'h-4 w-4')} />
            <CardTitle className={cn(live && 'text-2xl')}>{live ? 'Fika is live — get your guess in!' : "This week's fika"}</CardTitle>
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
        </div>
        {live && <LockCountdown target={event.closesAt} onElapsed={onWindowElapsed} />}
      </CardHeader>
      <CardContent className="space-y-4">
        {event.reveal && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Revealed answer</p>
            <p className="text-muted-foreground">{event.reveal.actualDescription}</p>
          </div>
        )}

        {live ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type of fika</Label>
              <CategoryPicker categories={categories} guesses={guesses} value={categoryId} onChange={setCategoryId} />
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

        {showGuesses && <GuessesList guesses={guesses} revealed={event.reveal !== null} wide={live} />}
      </CardContent>
    </Card>
  );
}
