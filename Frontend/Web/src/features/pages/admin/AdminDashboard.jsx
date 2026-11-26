import { useEffect, useState } from 'react';
import { LayoutDashboard, ShieldCheck, Users, Building2, Stethoscope, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearSession } from '../../../services/authService';
import { getAdminStats } from '../../../services/adminService';
import Overview from './Overview';
import UsersPage from './Users';
import Organizations from './Organizations';
import Verifications from './Verifications';
import Providers from './Providers';
import './AdminDashboard.css';

const tabs = [
  ['overview', 'Overview', LayoutDashboard],
  ['verifications', 'Organization requests', ShieldCheck],
  ['providers', 'Provider requests', Stethoscope],
  ['organizations', 'Organizations', Building2],
  ['users', 'Users', Users],
];
export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const refresh = async () => { try { setStats(await getAdminStats()); setError(''); } catch (e) { setError(e.message); } };
  useEffect(() => {
    let active = true;
    getAdminStats()
      .then((data) => { if (active) { setStats(data); setError(''); } })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  const logout = () => { clearSession(); navigate('/login', { replace: true }); };
  return <div className="admin-layout">
    <aside className="admin-sidebar">
      <div className="sidebar-brand"><div className="brand-logo-mini"><ShieldCheck color="white" /></div><div><h2>MedReach</h2><p>ADMIN PORTAL</p></div></div>
      <nav className="sidebar-nav">{tabs.map(([key, label, Icon]) => <button key={key} className={`nav-item ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-footer"><button className="logout-btn" onClick={logout}><LogOut size={18}/> Log out</button></div>
    </aside>
    <main className="admin-main">
      <header className="top-navbar"><span className="portal-title">{tabs.find(x => x[0] === tab)?.[1]}</span><span className="user-role">Administrator</span></header>
      <div className="dashboard-content">
        {error && <div className="alert error">{error}</div>}
        {tab === 'overview' && <Overview stats={stats} />}
        {tab === 'users' && <UsersPage />}
        {tab === 'organizations' && <Organizations />}
        {tab === 'verifications' && <Verifications onChanged={refresh} />}
        {tab === 'providers' && <Providers onChanged={refresh} />}
      </div>
    </main>
  </div>;
}
