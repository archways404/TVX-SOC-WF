import { Link, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ProtectedRoute, AdminRoute } from '@/routes/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { HistoryPage } from '@/pages/HistoryPage';
import { AdminPage } from '@/pages/AdminPage';

function Nav() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header className="border-b">
      <div className="container flex h-14 items-center justify-between">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link to="/">Fika Friday</Link>
          <Link to="/history" className="text-muted-foreground hover:text-foreground">
            History
          </Link>
          {user.role === 'admin' && (
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{user.name}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container py-6">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}
