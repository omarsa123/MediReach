import { useEffect, useState } from 'react';
import { Building2, BriefcaseMedical, Users, CalendarDays, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getOrganizationDashboardData } from '../../services/organizationService';
import '../../features/organization/organization.css';

export default function OrganizationDashboard() {
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { logout: clearAuth } = useAuth();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getOrganizationDashboardData();
      setProfile(data.profile);
      setServices(data.services);
      setAssignments(data.assignments);
      setAppointments(data.appointments);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getOrganizationDashboardData()
      .then((data) => {
        if (active) {
          setProfile(data.profile);
          setServices(data.services);
          setAssignments(data.assignments);
          setAppointments(data.appointments);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const logout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  const orgName = profile?.organizationName || 'Organization portal';

  return (
    <div className="org-shell">
      <aside className="org-sidebar">
        <div className="org-brand">
          <Building2 />
          <div>
            <b>MedReach</b>
            <small>ORGANIZATION</small>
          </div>
        </div>
        <div className="org-nav active">
          <Building2 /> Dashboard
        </div>
        <div className="org-sidebar-bottom">
          <button onClick={logout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <main className="org-main">
        <header className="org-header">
          <div>
            <h1>{orgName}</h1>
            <p>Manage your healthcare organization</p>
          </div>
          <button className="org-refresh" onClick={load}>
            <RefreshCw size={16} /> Refresh
          </button>
        </header>

        {error && <div className="org-error">{error}</div>}
        {loading ? (
          <p>Loading organization workspace…</p>
        ) : (
          <>
            <div className="org-status">
              <span>Verification status</span>
              <b className={`org-pill ${profile?.verificationStatus === 'Approved' ? 'approved' : ''}`}>
                {profile?.verificationStatus || 'Unknown'}
              </b>
            </div>

            <section className="org-kpis">
              <article>
                <Building2 />
                <span>Organization type</span>
                <strong>{profile?.organizerType || '—'}</strong>
              </article>
              <article>
                <BriefcaseMedical />
                <span>Active services</span>
                <strong>{services.filter((x) => x.isActive).length}</strong>
              </article>
              <article>
                <Users />
                <span>Provider assignments</span>
                <strong>{assignments.length}</strong>
              </article>
              <article>
                <CalendarDays />
                <span>Appointments</span>
                <strong>{appointments.length}</strong>
              </article>
            </section>

            <section className="org-panel">
              <h2>Organization profile</h2>
              <div className="org-details">
                <div>
                  <small>Address</small>
                  <b>{profile?.address || 'Not provided'}</b>
                </div>
                <div>
                  <small>Description</small>
                  <b>{profile?.description || 'No description yet'}</b>
                </div>
                <div>
                  <small>Contact</small>
                  <b>{profile?.email || 'Use your registered account email'}</b>
                </div>
              </div>
            </section>

            <section className="org-panel">
              <h2>Recent services</h2>
              {services.length ? (
                <div className="org-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Price</th>
                        <th>Duration</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.slice(0, 8).map((s, i) => (
                        <tr key={s.organizerServiceId || i}>
                          <td>{s.name || s.serviceName || `Service ${s.serviceId}`}</td>
                          <td>{s.price ?? '—'}</td>
                          <td>{s.durationMinutes ? `${s.durationMinutes} min` : '—'}</td>
                          <td>{s.isActive ? 'Active' : 'Inactive'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="org-muted">No services have been configured yet.</p>
              )}
            </section>

            <section className="org-panel">
              <h2>Appointments</h2>
              <p className="org-muted">
                {appointments.length
                  ? `${appointments.length} appointments returned by the API.`
                  : 'No appointments found.'}
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
