import { NavLink, Route, Routes } from 'react-router-dom';
import { Coffee, History, LogOut, ShieldCheck, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { VersionFooter } from '@/components/VersionFooter';
import { Avatar } from '@/components/ui/avatar';
import { cn, formatShortName } from '@/lib/utils';
import { ProtectedRoute, AdminRoute } from '@/routes/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ScoreboardPage } from '@/pages/ScoreboardPage';
import { AdminPage } from '@/pages/AdminPage';

function NavItem({ to, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        )
      }
    >
      <Icon className="h-4 w-4" />
      {children}
    </NavLink>
  );
}

function Nav() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Coffee className="h-4 w-4" />
          </span>
          Fika Friday
        </div>

        {user && (
          <nav className="hidden items-center gap-1 sm:flex">
            <NavItem to="/" icon={Coffee}>
              This week
            </NavItem>
            <NavItem to="/history" icon={History}>
              History
            </NavItem>
            <NavItem to="/scoreboard" icon={Trophy}>
              Scoreboard
            </NavItem>
            {user.role === 'admin' && (
              <NavItem to="/admin" icon={ShieldCheck}>
                Admin
              </NavItem>
            )}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user && (
            <>
              <span className="hidden items-center gap-2 text-sm font-medium sm:flex">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground',
                    user.glitter && 'glitter-avatar',
                  )}
                >
                  <Avatar name={user.name} src={user.avatarUrl} size={64} />
                </span>
                <span className={cn(user.glitter && 'glitter-text')}>{formatShortName(user.name)}</span>
              </span>
              <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {user && (
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
          <NavItem to="/" icon={Coffee}>
            This week
          </NavItem>
          <NavItem to="/history" icon={History}>
            History
          </NavItem>
          <NavItem to="/scoreboard" icon={Trophy}>
            Scoreboard
          </NavItem>
          {user.role === 'admin' && (
            <NavItem to="/admin" icon={ShieldCheck}>
              Admin
            </NavItem>
          )}
        </nav>
      )}
    </header>
  );
}

export default function App() {
  return (
    // Column layout so the version footer sits at the bottom of the viewport on
    // short pages without adding scroll. dvh, not vh: mobile browser toolbars
    // make 100vh taller than what's actually visible.
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Nav />
      <main className="container flex-1 py-8">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/scoreboard" element={<ScoreboardPage />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </main>
      <VersionFooter />
    </div>
  );
}
