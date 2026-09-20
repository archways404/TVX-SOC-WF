import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let googleScriptPromise;

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);

    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;

    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));

    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export function GoogleSignInButton() {
  const buttonRef = useRef(null);
  const { loginWithGoogleCredential } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.error('VITE_GOOGLE_CLIENT_ID is missing from frontend build');
      return;
    }

    loadGoogleScript()
      .then(() => {
        if (cancelled) return;

        if (!window.google?.accounts?.id) {
          throw new Error('Google Identity Services loaded but API is unavailable');
        }

        if (!buttonRef.current) {
          throw new Error('Google button container does not exist');
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            try {
              if (!credential) {
                throw new Error('Google returned no credential');
              }

              await loginWithGoogleCredential(credential);
            } catch (err) {
              console.error('Google login failed:', err);
            }
          },
        });

        // Re-render on theme changes so the button matches dark/light mode.
        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
        });
      })
      .catch((err) => {
        console.error('Google Sign-In initialization failed:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogleCredential, theme]);

  return <div ref={buttonRef} />;
}
