import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from '../features/auth/Login';
import SignUp from '../features/auth/SignUp';
import ForgotPassword from '../features/auth/ForgotPassword';
import ResetPassword from '../features/auth/ResetPassword';
import VerifyOTP from '../features/auth/VerifyOTP';
import AdminDashboard from '../pages/admin/AdminDashboard';
import OrganizationDashboard from '../pages/organization/OrganizationDashboard';
import Forbidden from '../pages/Forbidden';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-register" element={<AdminDashboard initialTab="register" />} />
        </Route>
        <Route element={<ProtectedRoute roles={['organization']} />}>
          <Route path="/org-dashboard" element={<OrganizationDashboard />} />
        </Route>

        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
