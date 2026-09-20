import { useState } from 'react';
import { ShieldCheck, CalendarDays, Users, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminEventsTab } from '@/pages/admin/AdminEventsTab';
import { AdminPlayersTab } from '@/pages/admin/AdminPlayersTab';
import { AdminSqlTab } from '@/pages/admin/AdminSqlTab';

const TABS = [
  { id: 'events', label: 'Events', icon: CalendarDays, component: AdminEventsTab },
  { id: 'players', label: 'Players & Scores', icon: Users, component: AdminPlayersTab },
  { id: 'sql', label: 'SQL Console', icon: Terminal, component: AdminSqlTab },
];

export function AdminPage() {
  const [tab, setTab] = useState('events');
  const ActiveTab = TABS.find((t) => t.id === tab)?.component ?? AdminEventsTab;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        Admin
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <ActiveTab />
    </div>
  );
}
