import { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { getPendingOrganizations, verifyOrganizationStatus } from '../../../services/adminService';

export default function Verifications({ onChanged }) {
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPendingOrganizations();
      setPendingOrgs(data || []);
    } catch (error) {
      console.error('Error fetching pending organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerify = async (userId, status) => {
    try {
      await verifyOrganizationStatus(userId, status);
      alert(`Organization has been ${status}!`);
      await loadData();
      onChanged?.(); // يحدّث العداد اللي في الـ sidebar
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <>
      <div className="page-header">
        <div className="header-titles">
          <h1>Verification Requests</h1>
          <p>Review and approve new healthcare organizations.</p>
        </div>
      </div>

      <div className="chart-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Organization Name</th>
              <th>Type</th>
              <th>Address</th>
              <th>License</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingOrgs.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">No pending requests.</td></tr>
            ) : (
              pendingOrgs.map((org) => (
                <tr key={org.userId}>
                  <td className="td-bold">{org.organizationName}</td>
                  <td>{org.organizerType}</td>
                  <td>{org.address}</td>
                  <td>
                    <a href={org.licenseDocumentUrl} target="_blank" rel="noreferrer" className="doc-link">
                      View Document
                    </a>
                  </td>
                  <td className="action-buttons">
                    <button onClick={() => handleVerify(org.userId, 'Approved')} className="action-btn btn-accept">
                      <CheckCircle size={14} /> Accept
                    </button>
                    <button onClick={() => handleVerify(org.userId, 'Rejected')} className="action-btn btn-reject">
                      <XCircle size={14} /> Reject
                    </button>
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