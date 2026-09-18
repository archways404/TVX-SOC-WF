import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleScript() {
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton() {
  const buttonRef = useRef(null);
  const { loginWithGoogleCredential } = useAuth();

  useEffect(() => {
    let cancelled = false;

    loadGoogleScript().then(() => {
      if (cancelled || !window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            await loginWithGoogleCredential(credential);
          } catch (err) {
            console.error('Google login failed', err);
          }
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogleCredential]);

  return <div ref={buttonRef} />;
}
