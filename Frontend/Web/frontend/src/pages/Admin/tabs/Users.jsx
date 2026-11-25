import { useState, useEffect } from 'react';
import { Ban } from 'lucide-react';
import { getAllUsers, toggleUserStatus } from '../../../services/adminService';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
    if (!window.confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    try {
      await toggleUserStatus(userId, newStatus);
      await loadData();
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  if (loading) return <div className="empty-state">Loading...</div>;

  return (
    <>
      <div className="page-header">
        <div className="header-titles">
          <h1>User Management</h1>
          <p>Manage all accounts and suspensions.</p>
        </div>
      </div>

      <div className="chart-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">No users found.</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.userId}>
                  <td className="td-medium">{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>
                    <span className={`status-badge ${user.status === 'Active' ? 'status-active' : 'status-suspended'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggle(user.userId, user.status)}
                      className={`action-btn ${user.status === 'Active' ? 'btn-suspend' : 'btn-activate'}`}
                    >
                      <Ban size={14} /> {user.status === 'Active' ? 'Suspend' : 'Activate'}
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