import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function HistoryPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get('/api/fika/history').then(setEvents);
  }, []);

  return (
    <div className="space-y-4">
      {events.length === 0 && <p className="text-sm text-muted-foreground">No past fikas yet.</p>}
      {events.map((event) => (
        <Card key={event.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{event.eventDate}</CardTitle>
              <Badge variant="secondary">{event.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
