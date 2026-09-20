import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-border bg-muted transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      <Sun className="absolute left-1.5 h-4 w-4 text-muted-foreground" />
      <Moon className="absolute right-1.5 h-4 w-4 text-muted-foreground" />
      <span
        className={cn(
          'z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background text-primary shadow transition-transform',
          isDark ? 'translate-x-7' : 'translate-x-1',
        )}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
