import { Navigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Leaderboard } from '@/components/Leaderboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Card className="w-full max-w-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Use your Telavox Google account</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-5 pt-0">
            <GoogleSignInButton />
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Coffee className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Fika Friday</h1>
        <p className="text-sm text-muted-foreground">Guess the fika, climb the leaderboard.</p>
      </div>

      <div className="mx-auto max-w-2xl">
        <Leaderboard />
      </div>
    </div>
  );
}
