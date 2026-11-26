import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './features/auth/Login';
import SignUp from './features/auth/SignUp';
import ForgotPassword from './features/auth/ForgotPassword';
import ResetPassword from './features/auth/ResetPassword';
import VerifyOTP from './features/auth/VerifyOTP';
import AdminDashboard from './features/pages/admin/AdminDashboard';
import OrganizationDashboard from './features/pages/organization/OrganizationDashboard';
import ProtectedRoute from './app/ProtectedRoute';

function Forbidden() { return <main style={{padding:40,fontFamily:'sans-serif'}}><h1>Access denied</h1><p>Your account does not have permission to open this workspace.</p><a href="/login">Return to login</a></main>; }
export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<Navigate to="/login" replace/>}/>
    <Route path="/login" element={<Login/>}/><Route path="/signup" element={<SignUp/>}/>
    <Route path="/verify-otp" element={<VerifyOTP/>}/><Route path="/forgot-password" element={<ForgotPassword/>}/><Route path="/reset-password" element={<ResetPassword/>}/>
    <Route element={<ProtectedRoute roles={['admin']}/> }><Route path="/admin-dashboard" element={<AdminDashboard/>}/></Route>
    <Route element={<ProtectedRoute roles={['organization']}/> }><Route path="/org-dashboard" element={<OrganizationDashboard/>}/></Route>
    <Route path="/forbidden" element={<Forbidden/>}/><Route path="*" element={<Navigate to="/login" replace/>}/>
  </Routes></BrowserRouter>;
}
