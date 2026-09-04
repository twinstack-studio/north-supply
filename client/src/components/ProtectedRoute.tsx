import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

/** Gate for signed-in routes; pass adminOnly for the dashboard. */
export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Checking your session" />;

  if (!user) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}
