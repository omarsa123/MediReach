import { Navigate, Outlet } from 'react-router-dom';
export default function ProtectedRoute({ roles }) {
  const token = localStorage.getItem('medreach_token');
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('medreach_user') || 'null'); } catch { return null; }
  })();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles?.length && !roles.includes(String(user.role || '').toLowerCase())) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
