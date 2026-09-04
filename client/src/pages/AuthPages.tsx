import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleButton } from '../components/GoogleButton';
import { OtpForm } from '../components/OtpForm';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../lib/api';
import type { PendingVerification } from '../types';

/** Shared split layout: form on the left, brand panel on the right. */
function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-68px)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="display text-4xl">{title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{subtitle}</p>
          {children}
          <div className="mt-7 border-t border-line pt-5 text-[14px] text-muted">{footer}</div>
        </div>
      </div>

      <aside className="hidden flex-col justify-between bg-ink p-12 text-paper lg:flex">
        <p className="display text-[20px]">
          NORTH<span className="text-blaze">·</span>SUPPLY
        </p>
        <div>
          <p className="display text-[clamp(2rem,3.2vw,3rem)]">
            Built heavy.
            <br />
            Worn daily.
            <br />
            <span className="text-blaze">Kept for years.</span>
          </p>
          <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-paper/60">
            An account gets you order history, saved addresses for faster checkout, and a wishlist
            that survives a restocked run.
          </p>
        </div>
        <p className="text-[12px] text-paper/40">
          Demo credentials — jordan@example.com / password123
        </p>
      </aside>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const { login } = useAuth();
  const { push } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingVerification | null>(null);

  const destination = location.state?.from ?? '/account';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const challenge = await login(email, password);
      if (challenge) {
        // Password was right, but the emailed code still has to be entered.
        setPending(challenge);
      } else {
        push('Welcome back.');
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign you in.');
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="One more step — enter the code we just sent you."
        footer={
          <>
            Wrong account?{' '}
            <button type="button" onClick={() => setPending(null)} className="font-bold text-ink underline">
              Start over
            </button>
          </>
        }
      >
        <OtpForm
          pending={pending}
          onVerified={() => {
            push('Welcome back.');
            navigate(destination, { replace: true });
          }}
          onCancel={() => setPending(null)}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Your bag, wishlist and order history are waiting."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-bold text-ink underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="login-email" className="label">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="login-password" className="label mb-0">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[12px] font-medium text-muted underline hover:text-ink"
            >
              Forgot?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </div>

        {error && (
          <p role="alert" className="border-l-4 border-sale bg-white px-4 py-3 text-[13px] font-medium text-sale">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Signing in…' : 'Continue'}
        </button>
      </form>

      <GoogleButton
        onSignedIn={() => {
          push('Welcome back.');
          navigate(destination, { replace: true });
        }}
      />
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { push } = useToast();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingVerification | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const challenge = await register(form);
      // The account is not created until the code is confirmed.
      if (challenge) setPending(challenge);
      else navigate('/account', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fields ?? {});
      } else {
        setError('Could not create your account.');
      }
    } finally {
      setBusy(false);
    }
  }

  const cls = (name: string) => (fields[name]?.length ? 'field field-error' : 'field');

  if (pending) {
    return (
      <AuthShell
        title="Confirm your email"
        subtitle="Your account is created once you enter the code."
        footer={
          <>
            Typo in your address?{' '}
            <button type="button" onClick={() => setPending(null)} className="font-bold text-ink underline">
              Go back
            </button>
          </>
        }
      >
        <OtpForm
          pending={pending}
          onVerified={() => {
            push('Account created. Welcome to NORTH SUPPLY.');
            navigate('/account', { replace: true });
          }}
          onCancel={() => setPending(null)}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Faster checkout, saved addresses, and a wishlist that sticks around."
      footer={
        <>
          Already have one?{' '}
          <Link to="/login" className="font-bold text-ink underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="label">
              First name
            </label>
            <input
              id="firstName"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className={cls('firstName')}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="label">
              Last name
            </label>
            <input
              id="lastName"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className={cls('lastName')}
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-email" className="label">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={cls('email')}
          />
          {fields.email && <p className="error-text">{fields.email[0]}</p>}
        </div>

        <div>
          <label htmlFor="register-password" className="label">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={cls('password')}
          />
          <p className="mt-1.5 text-[12px] text-muted">At least 8 characters.</p>
          {fields.password && <p className="error-text">{fields.password[0]}</p>}
        </div>

        {error && (
          <p role="alert" className="border-l-4 border-sale bg-white px-4 py-3 text-[13px] font-medium text-sale">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Sending code…' : 'Create account'}
        </button>
      </form>

      <GoogleButton
        onSignedIn={(created) => {
          push(created ? 'Account created. Welcome to NORTH SUPPLY.' : 'Welcome back.');
          navigate('/account', { replace: true });
        }}
      />
    </AuthShell>
  );
}
