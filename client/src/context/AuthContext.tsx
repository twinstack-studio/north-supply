import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import type { AuthConfig, OtpPurpose, PendingVerification, User } from '../types';

interface StepOneResponse {
  verificationRequired?: boolean;
  email?: string;
  expiresAt?: string;
  user?: User;
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  config: AuthConfig | null;
  /** Resolves to a pending challenge when a code is required, else null. */
  login: (email: string, password: string) => Promise<PendingVerification | null>;
  register: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<PendingVerification | null>;
  verifyCode: (pending: PendingVerification, code: string) => Promise<void>;
  resendCode: (pending: PendingVerification) => Promise<void>;
  signInWithGoogle: (credential: string) => Promise<{ created: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (input: {
    firstName: string;
    lastName: string;
    phone?: string | null;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AuthConfig | null>(null);

  // The session lives in an httpOnly cookie, so the only way to know who is
  // signed in is to ask the API on mount.
  useEffect(() => {
    api
      .get<{ user: User | null }>('/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    // Tells the sign-in UI whether Google and login codes are switched on.
    api.get<AuthConfig>('/auth/config').then(setConfig).catch(() => setConfig(null));
  }, []);

  /** Shared shape for register/login: either signed in, or a code is pending. */
  const handleStepOne = useCallback(
    (res: StepOneResponse, purpose: OtpPurpose): PendingVerification | null => {
      if (res.verificationRequired && res.email) {
        return { email: res.email, purpose, expiresAt: res.expiresAt ?? '' };
      }
      if (res.user) setUser(res.user);
      return null;
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string) =>
      handleStepOne(await api.post<StepOneResponse>('/auth/login', { email, password }), 'login'),
    [handleStepOne],
  );

  const register = useCallback(
    async (input: { email: string; password: string; firstName: string; lastName: string }) =>
      handleStepOne(await api.post<StepOneResponse>('/auth/register', input), 'registration'),
    [handleStepOne],
  );

  const verifyCode = useCallback(async (pending: PendingVerification, code: string) => {
    const path =
      pending.purpose === 'registration' ? '/auth/verify-registration' : '/auth/verify-login';
    const res = await api.post<{ user: User }>(path, { email: pending.email, code });
    setUser(res.user);
  }, []);

  const resendCode = useCallback(async (pending: PendingVerification) => {
    await api.post('/auth/resend-code', { email: pending.email, purpose: pending.purpose });
  }, []);

  const signInWithGoogle = useCallback(async (credential: string) => {
    const res = await api.post<{ user: User; created: boolean }>('/auth/google', { credential });
    setUser(res.user);
    return { created: res.created };
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (input: { firstName: string; lastName: string; phone?: string | null }) => {
      const res = await api.patch<{ user: User }>('/auth/me', input);
      setUser(res.user);
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      config,
      login,
      register,
      verifyCode,
      resendCode,
      signInWithGoogle,
      logout,
      updateProfile,
    }),
    [user, loading, config, login, register, verifyCode, resendCode, signInWithGoogle, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
