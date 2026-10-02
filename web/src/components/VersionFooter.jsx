import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/* global __UI_VERSION__ */
const UI_VERSION = __UI_VERSION__;

// UI and API versions side by side — after a deploy both should match; a
// mismatch means the browser is still running an old cached bundle.
export function VersionFooter() {
  const [apiVersion, setApiVersion] = useState(null);

  useEffect(() => {
    api
      .get('/api/version')
      .then((body) => setApiVersion(body.version))
      .catch(() => setApiVersion('unreachable'));
  }, []);

  return (
    <footer className="container py-3">
      <p className="flex flex-wrap justify-center gap-x-3 font-mono text-xs text-success">
        <span>UI {UI_VERSION}</span>
        <span className="text-muted-foreground">·</span>
        <span>API {apiVersion ?? '…'}</span>
      </p>
    </footer>
  );
}
