import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import SignUp from './pages/Auth/SignUp';
import ForgotPassword from './pages/Auth/ForgotPassword'; // إضافة
import ResetPassword from './pages/Auth/ResetPassword'; // إضافة
import AdminDashboard from './pages/Admin/AdminDashboard';
import VerifyOTP from './pages/Auth/VerifyOTP';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} /> {/* المسار الجديد */}
        <Route path="/reset-password" element={<ResetPassword />} /> {/* المسار الجديد */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/org-dashboard" element={<div>Organization Dashboard</div>} />
      </Routes>
    </Router>
  );
}

export default App;