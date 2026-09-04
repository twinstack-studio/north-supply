import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../lib/api';
import type { PendingVerification } from '../types';

const LENGTH = 6;

/**
 * Six single-character boxes that behave like one field: typing advances,
 * backspace retreats, and pasting a whole code fills every box.
 */
export function OtpForm({
  pending,
  onVerified,
  onCancel,
}: {
  pending: PendingVerification;
  onVerified: () => void;
  onCancel: () => void;
}) {
  const { verifyCode, resendCode, config } = useAuth();
  const { push } = useToast();

  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  // Resend is rate-limited server-side; the countdown keeps the UI honest.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const code = digits.join('');

  function setDigit(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1);
    setDigits((current) => {
      const next = [...current];
      next[index] = char;
      return next;
    });
    if (char && index < LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) return;
    event.preventDefault();
    const next = Array(LENGTH).fill('');
    pasted.split('').forEach((c, i) => (next[i] = c));
    setDigits(next);
    inputs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (code.length !== LENGTH) {
      setError('Enter all six digits.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyCode(pending, code);
      onVerified();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify that code.');
      setDigits(Array(LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      await resendCode(pending);
      setCooldown(30);
      setDigits(Array(LENGTH).fill(''));
      setError(null);
      inputs.current[0]?.focus();
      push('New code sent.');
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not resend the code.', 'error');
    }
  }

  return (
    <form onSubmit={submit} className="mt-8">
      {config && !config.mailDelivery ? (
        <div className="border-l-4 border-blaze bg-white px-4 py-3.5 text-[13px] leading-relaxed">
          <strong className="block text-[12px] uppercase tracking-[0.12em] text-blaze">
            No mail server configured
          </strong>
          <p className="mt-1.5 text-muted">
            Nothing was emailed to <strong className="text-ink">{pending.email}</strong>. The code
            is printed in the server terminal as{' '}
            <code className="text-ink">[otp] … code for {pending.email}</code>, and saved to{' '}
            <code className="text-ink">server/.mail-outbox/</code>. Set{' '}
            <code className="text-ink">SMTP_HOST</code> to send for real.
          </p>
        </div>
      ) : (
        <p className="text-[15px] leading-relaxed text-muted">
          We sent a six-digit code to <strong className="text-ink">{pending.email}</strong>. It
          expires shortly and can only be used once.
        </p>
      )}

      <div className="mt-7 flex justify-between gap-2" onPaste={onPaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputs.current[index] = el;
            }}
            value={digit}
            onChange={(e) => setDigit(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e)}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            aria-label={`Digit ${index + 1} of ${LENGTH}`}
            className={`h-14 w-full border text-center text-2xl font-bold tabular-nums focus:outline-none ${
              error ? 'border-sale' : 'border-line-strong focus:border-ink'
            }`}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 border-l-4 border-sale bg-white px-4 py-3 text-[13px] font-medium text-sale">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
        {busy ? 'Verifying…' : 'Verify and continue'}
      </button>

      <div className="mt-5 flex items-center justify-between text-[13px]">
        <button type="button" onClick={onCancel} className="text-muted underline hover:text-ink">
          Use a different email
        </button>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={cooldown > 0}
          className="font-bold text-ink underline disabled:cursor-not-allowed disabled:font-medium disabled:text-muted disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
}
