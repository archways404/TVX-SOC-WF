import { useEffect, useState } from 'react';
import { History, ChevronDown, ChevronUp, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn, formatEventWeek } from '@/lib/utils';

const STATUS_VARIANT = { awaiting_reveal: 'outline', revealed: 'secondary', scored: 'success' };
const STATUS_LABEL = { awaiting_reveal: 'Awaiting reveal', revealed: 'Revealed', scored: 'Scored' };

function CorrectMark({ value }) {
  if (value === null) return <Circle className="h-4 w-4 text-muted-foreground/50" />;
  return value ? (
    <CheckCircle2 className="h-4 w-4 text-success" />
  ) : (
    <XCircle className="h-4 w-4 text-destructive/70" />
  );
}

function EventHistoryCard({ event }) {
  const [expanded, setExpanded] = useState(false);
  const guesses = event.guesses ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{formatEventWeek(event.eventDate)}</CardTitle>
          <Badge variant={STATUS_VARIANT[event.status] ?? 'secondary'}>
            {STATUS_LABEL[event.status] ?? event.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="text-muted-foreground">Answer: </span>
          {event.reveal?.actualDescription ?? 'Not revealed yet'}
        </p>
        {event.myGuess && (
          <p>
            <span className="text-muted-foreground">Your guess: </span>
            {event.myGuess.description}
            {event.myGuess.pointsAwarded !== null && ` — ${event.myGuess.pointsAwarded} pts`}
          </p>
        )}

        {guesses.length > 0 && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 gap-1 text-muted-foreground"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? 'Hide' : 'Show'} everyone's guesses ({guesses.length})
            </Button>

            {expanded && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Guess</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guesses.map((g) => (
                    <TableRow key={g.userId} className={cn(g.isMe && 'bg-accent/40')}>
                      <TableCell className="font-medium">{g.isMe ? 'You' : g.userName}</TableCell>
                      <TableCell>{g.categoryLabel ?? '—'}</TableCell>
                      <TableCell className="max-w-[14rem] truncate">{g.description}</TableCell>
                      <TableCell>
                        <CorrectMark value={g.categoryCorrect} />
                      </TableCell>
                      <TableCell>
                        <CorrectMark value={g.descriptionCorrect} />
                      </TableCell>
                      <TableCell className="text-right font-semibold">{g.pointsAwarded}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function HistoryPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get('/api/fika/history').then(setEvents);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="h-4 w-4" />
        Past fikas
      </div>
      {events.length === 0 && <p className="text-sm text-muted-foreground">No past fikas yet.</p>}
      {events.map((event) => (
        <EventHistoryCard key={event.id} event={event} />
      ))}
    </div>
  );
}
