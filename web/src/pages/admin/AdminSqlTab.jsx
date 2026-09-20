import { useState } from 'react';
import { Play, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function ResultView({ result }) {
  if (!result) return null;

  if (result.type === 'result') {
    return (
      <p className="text-sm text-muted-foreground">
        OK — {result.affectedRows} row{result.affectedRows === 1 ? '' : 's'} affected
        {result.changedRows ? `, ${result.changedRows} changed` : ''}
        {result.insertId ? `, insert id ${result.insertId}` : ''}.
      </p>
    );
  }

  if (result.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Query ran fine — 0 rows returned.</p>;
  }

  return (
    <div className="max-h-[28rem] overflow-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {result.columns.map((col) => (
              <TableHead key={col} className="whitespace-nowrap">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((row, i) => (
            <TableRow key={i}>
              {result.columns.map((col) => (
                <TableCell key={col} className="whitespace-nowrap font-mono text-xs">
                  {row[col] === null ? <span className="text-muted-foreground">NULL</span> : String(row[col])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">{result.rowCount} row(s)</p>
    </div>
  );
}

export function AdminSqlTab() {
  const [sql, setSql] = useState('SELECT * FROM fika_events ORDER BY event_date DESC LIMIT 20;');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  async function run(confirmed) {
    setRunning(true);
    setError(null);
    try {
      const res = await api.post('/api/admin/sql', { sql, confirm: confirmed });
      setResult(res);
      setPendingConfirm(false);
    } catch (err) {
      if (err.status === 409 && err.body?.requiresConfirm) {
        setPendingConfirm(true);
      } else {
        setError(err.message);
        setResult(null);
      }
    } finally {
      setRunning(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    run(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>SQL console</CardTitle>
          <CardDescription>
            Runs directly against the database with your admin session — no query is blocked. One statement per run.
            Anything other than SELECT/SHOW/EXPLAIN asks for confirmation first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  run(false);
                }
              }}
              spellCheck={false}
              rows={8}
              className="w-full rounded-md border border-input bg-background p-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="SELECT * FROM users;"
            />
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={running || !sql.trim()}>
                {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Run (Ctrl+Enter)
              </Button>
              {error && <span className="text-sm text-destructive">{error}</span>}
            </div>
          </form>

          <ResultView result={result} />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingConfirm}
        title="Run this write/DDL statement?"
        description="This isn't a SELECT/SHOW/EXPLAIN — it will change the database and can't be undone automatically."
        confirmLabel="Run it"
        variant="destructive"
        onConfirm={() => run(true)}
        onCancel={() => setPendingConfirm(false)}
      />

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        This talks to the live database with no undo. Prefer the Events/Players tabs for routine changes — use this
        for anything they don't cover.
      </p>
    </div>
  );
}
