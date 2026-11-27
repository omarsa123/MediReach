import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles?.length && !roles.includes(role || '')) {
    return <Navigate to="/forbidden" replace />;
  }
  return <Outlet />;
}
