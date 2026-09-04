import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { IconCheck } from '../components/Icons';
import { Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../lib/api';

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="shell flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <h1 className="display text-4xl">{title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the reset email.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Shell
        title="Check your inbox"
        subtitle="If that email has an account, a reset link is on its way. It works once and expires in an hour."
      >
        <p className="mt-7 flex items-start gap-3 border-l-4 border-success bg-white px-5 py-4 text-[14px]">
          <IconCheck width={18} height={18} className="mt-0.5 shrink-0 text-success" />
          <span>
            Sent to <strong>{email}</strong>. Nothing arrived? Check spam, or{' '}
            <button type="button" onClick={() => setSent(false)} className="underline">
              try another address
            </button>
            .
          </span>
        </p>
        <Link to="/login" className="btn-ghost mt-6 w-full">
          Back to sign in
        </Link>
      </Shell>
    );
  }

  return (
    <Shell
      title="Forgot password"
      subtitle="Enter your email and we'll send you a link to choose a new one."
    >
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="fp-email" className="label">
            Email
          </label>
          <input
            id="fp-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </div>
        {error && (
          <p role="alert" className="border-l-4 border-sale bg-white px-4 py-3 text-[13px] font-medium text-sale">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
        <Link to="/login" className="btn-ghost w-full">
          Back to sign in
        </Link>
      </form>
    </Shell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const token = params.get('token') ?? '';

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check the token up front so an expired link says so before the user types.
  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    api
      .get<{ valid: boolean }>(`/auth/reset-password/${encodeURIComponent(token)}`)
      .then((r) => setValid(r.valid))
      .catch(() => setValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', { token, password });
      push('Password updated. Sign in with your new one.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset your password.');
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <Spinner label="Checking your link" />;

  if (!token || !valid) {
    return (
      <Shell
        title="Link expired"
        subtitle="Reset links work once and last an hour. Request a fresh one and we'll send it straight over."
      >
        <Link to="/forgot-password" className="btn-primary mt-7 w-full">
          Request a new link
        </Link>
      </Shell>
    );
  }

  return (
    <Shell title="Choose a new password" subtitle="Make it at least 8 characters.">
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="rp-password" className="label">
            New password
          </label>
          <input
            id="rp-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="rp-confirm" className="label">
            Confirm password
          </label>
          <input
            id="rp-confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={confirm && confirm !== password ? 'field field-error' : 'field'}
          />
        </div>
        {error && (
          <p role="alert" className="border-l-4 border-sale bg-white px-4 py-3 text-[13px] font-medium text-sale">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </Shell>
  );
}
