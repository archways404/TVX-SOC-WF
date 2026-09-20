import { Navigate } from 'react-router-dom';
import { Coffee, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Leaderboard } from '@/components/Leaderboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-start">
      <Card className="order-1">
        <CardHeader className="items-center pb-4 text-center">
          <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Coffee className="h-6 w-6" />
          </span>
          <CardTitle className="text-2xl">Fika Friday</CardTitle>
          <CardDescription>Sign in with your Telavox Google account to guess this week&apos;s fika.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <GoogleSignInButton />
        </CardContent>
      </Card>

      <div className="order-2 space-y-3">
        <div className="flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground lg:hidden">
          <Trophy className="h-4 w-4" />
          Current standings
        </div>
        <Leaderboard />
      </div>
    </div>
  );
}
