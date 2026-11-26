import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { getPendingProviders, verifyProviderStatus } from '../../../services/adminService';
export default function Providers({ onChanged }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = async () => { setLoading(true); try { setItems(await getPendingProviders()); setError(''); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  useEffect(() => {
    let active = true;
    getPendingProviders()
      .then((data) => { if (active) { setItems(data); setError(''); } })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const decide = async (id, status) => { try { await verifyProviderStatus(id, status); await load(); onChanged?.(); } catch (e) { setError(e.message); } };
  return <><div className="page-header"><div className="header-titles"><h1>Provider verification</h1><p>Review healthcare professionals awaiting approval.</p></div></div>{error && <p className="alert error">{error}</p>}<div className="chart-card"><table className="data-table"><thead><tr><th>Name</th><th>Type</th><th>Specialization</th><th>License</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="5">Loading…</td></tr> : items.length ? items.map(p => <tr key={p.userId}><td>{p.name}<br/><small>{p.email}</small></td><td>{p.providerType}</td><td>{p.specialization}</td><td>{p.licenseNumber}</td><td className="action-buttons"><button className="action-btn btn-accept" onClick={() => decide(p.userId, 'Approved')}><CheckCircle size={14}/> Approve</button><button className="action-btn btn-reject" onClick={() => decide(p.userId, 'Rejected')}><XCircle size={14}/> Reject</button></td></tr>) : <tr><td colSpan="5" className="empty-state">No pending providers.</td></tr>}</tbody></table></div></>;
}
