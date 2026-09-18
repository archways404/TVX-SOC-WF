import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function LoginPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Fika Friday</CardTitle>
          <CardDescription>Sign in with your Telavox Google account to play.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <GoogleSignInButton />
        </CardContent>
      </Card>
    </div>
  );
}
