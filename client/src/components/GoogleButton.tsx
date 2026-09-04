import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../lib/api';

/** Minimal surface of the Google Identity Services global we rely on. */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

/** Loads the GIS script once, however many buttons are on the page. */
function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('gis failed')));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('gis failed'));
    document.head.appendChild(script);
  });
}

export function GoogleButton({ onSignedIn }: { onSignedIn: (created: boolean) => void }) {
  const { config, signInWithGoogle } = useAuth();
  const { push } = useToast();
  const holder = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  const clientId = config?.googleClientId ?? null;

  useEffect(() => {
    if (!clientId || !holder.current) return;
    let cancelled = false;

    loadGis()
      .then(() => {
        if (cancelled || !holder.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            signInWithGoogle(credential)
              .then(({ created }) => onSignedIn(created))
              .catch((err) =>
                push(
                  err instanceof ApiError ? err.message : 'Google sign-in failed.',
                  'error',
                ),
              );
          },
        });
        window.google.accounts.id.renderButton(holder.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
        });
      })
      // Offline, or the script is blocked -- say so instead of showing a gap.
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [clientId, signInWithGoogle, onSignedIn, push]);

  // Not configured on this server: render nothing at all.
  if (!clientId) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="mt-5 flex justify-center">
        {failed ? (
          <p className="text-[13px] text-muted">
            Google sign-in could not load. Check your connection and refresh.
          </p>
        ) : (
          <div ref={holder} />
        )}
      </div>
    </div>
  );
}
