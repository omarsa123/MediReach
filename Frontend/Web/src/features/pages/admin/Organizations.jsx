import { useState, useEffect } from 'react';
import { getAllOrganizations } from '../../../services/adminService';

export default function Organizations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllOrganizations();
        setOrgs(data || []);
        setError('');
      } catch (error) {
        setError(error.message || 'Failed to load organizations.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <>
      <div className="page-header">
        <div className="header-titles">
          <h1>Organizations</h1>
          <p>All hospitals, clinics, labs and physiotherapy centers.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      <div className="chart-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Email</th>
              <th>Address</th>
              <th>Verification</th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">No organizations found.</td></tr>
            ) : (
              orgs.map((org) => (
                <tr key={org.userId}>
                  <td className="td-bold">{org.organizationName}</td>
                  <td>{org.organizerType}</td>
                  <td>{org.email}</td>
                  <td>{org.address}</td>
                  <td>
                    <span className={`status-badge ${org.verificationStatus === 'Approved' ? 'status-active' : 'status-suspended'}`}>
                      {org.verificationStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}