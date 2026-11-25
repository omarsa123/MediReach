import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShieldCheck, Users as UsersIcon, Building2,
  LogOut, Search, X,
} from 'lucide-react';
import { getAdminStats, searchGlobalUser } from '../../services/adminService';
import Overview from './tabs/Overview';
import Verifications from './tabs/Verifications';
import Organizations from './tabs/Organizations';
import Users from './tabs/Users';
import './AdminDashboard.css';

const EMPTY_STATS = {
  totalUsers: 0, totalHospitals: 0, totalClinics: 0,
  totalLabs: 0, totalPhysio: 0, pendingCount: 0,
};

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { key: 'verifications', label: 'Verifications', icon: ShieldCheck, badge: true },
  { key: 'organizations', label: 'Organizations', icon: Building2 },
  { key: 'users', label: 'User Management', icon: UsersIcon },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(EMPTY_STATS);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await getAdminStats();
      setStats(data || EMPTY_STATS);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('medreach_token');
    localStorage.removeItem('medreach_refresh_token');
    navigate('/login');
  };

  const handleGlobalSearch = async (e) => {
    if (e.key !== 'Enter' || !searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const data = await searchGlobalUser(searchQuery.trim());
      setSearchResult(data);
      setShowSearchModal(true);
    } catch {
      alert('User not found. Please check the email or username.');
    } finally {
      setIsSearching(false);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <Overview stats={stats} />;
      case 'verifications': return <Verifications onChanged={fetchStats} />;
      case 'organizations': return <Organizations />;
      case 'users': return <Users />;
      default: return null;
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo-mini"><ShieldCheck size={24} color="#ffffff" /></div>
          <div><h2>MedReach</h2><p>ADMIN WEB PORTAL</p></div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ key, label, icon: Icon, badge }) => (
            <a
              key={key}
              href="#"
              className={`nav-item ${badge ? 'has-badge' : ''} ${activeTab === key ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); setActiveTab(key); }}
            >
              <Icon size={20} />
              <span>{label}</span>
              {badge && stats.pendingCount > 0 && <span className="badge">{stats.pendingCount}</span>}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} /><span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="top-navbar">
          <div className="nav-left"><span className="portal-title">Admin Controls</span></div>
          <div className="nav-right">
            <div className="search-bar">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder={isSearching ? 'Searching...' : 'Search by email or username... (Press Enter)'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleGlobalSearch}
                disabled={isSearching}
              />
            </div>
            <div className="user-profile">
              <div className="avatar"><ShieldCheck size={18} color="#fff" /></div>
              <div className="user-info">
                <span className="user-name">Admin</span>
                <span className="user-role">Administrator</span>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-content">{renderTab()}</div>
      </main>

      {showSearchModal && searchResult && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Search Result</h3>
              <button onClick={() => setShowSearchModal(false)} className="close-modal-btn"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-row"><span className="label">Name:</span> <div className="value bold">{searchResult.name}</div></div>
              <div className="modal-row"><span className="label">Username:</span> <div className="value">@{searchResult.username}</div></div>
              <div className="modal-row"><span className="label">Email:</span> <div className="value">{searchResult.email}</div></div>
              <div className="modal-row" style={{ marginTop: '8px' }}>
                <span className="label">Account Role:</span>
                <div><span className="role-badge">{searchResult.role}</span></div>
              </div>
            </div>
            <button onClick={() => setShowSearchModal(false)} className="modal-action-btn">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}