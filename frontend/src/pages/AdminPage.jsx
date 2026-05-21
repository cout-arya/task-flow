import React, { useState, useEffect } from 'react';
import { getAllUsersAPI, getStatsAPI, changeRoleAPI, deleteUserAPI } from '../api/admin';
import { useAuth } from '../context/AuthContext';

const AdminPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([getAllUsersAPI(), getStatsAPI()]);
      setUsers(usersRes.data.data.users);
      setStats(statsRes.data.data);
    } catch { showToast('Failed to load data.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRoleChange = async (id, role) => {
    try {
      await changeRoleAPI(id, role);
      showToast(`Role updated to ${role}!`);
      fetchData();
    } catch (err) { showToast(err.response?.data?.message || 'Failed to update role.', 'error'); }
  };

  const handleDelete = async (id) => {
    if (deleteConfirm !== id) { setDeleteConfirm(id); setTimeout(() => setDeleteConfirm(null), 3000); return; }
    try {
      await deleteUserAPI(id);
      showToast('User deleted.');
      setDeleteConfirm(null);
      fetchData();
    } catch (err) { showToast(err.response?.data?.message || 'Delete failed.', 'error'); }
  };

  return (
    <div className="page-container">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage users and platform analytics</p>
        </div>
        <span className="badge badge-admin">👑 Admin</span>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card stat-total"><span className="stat-icon">👥</span><div><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Total Users</div></div></div>
          <div className="stat-card stat-progress"><span className="stat-icon">📋</span><div><div className="stat-value">{stats.totalTasks}</div><div className="stat-label">Total Tasks</div></div></div>
          {stats.tasksByStatus?.map(s => <div key={s._id} className="stat-card stat-done"><span className="stat-icon">{s._id === 'done' ? '✅' : s._id === 'in-progress' ? '⚡' : '📌'}</span><div><div className="stat-value">{s.count}</div><div className="stat-label">{s._id}</div></div></div>)}
        </div>
      )}

      <div className="admin-table-card">
        <div className="table-header">
          <h2>User Management</h2>
          <span className="user-count">{users.length} users</span>
        </div>
        {loading ? (
          <div className="tasks-loading">{[...Array(4)].map((_, i) => <div key={i} className="task-skeleton" style={{ height: '56px', borderRadius: '8px' }} />)}</div>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Tasks</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className={u._id === currentUser?._id ? 'current-user-row' : ''}>
                    <td>
                      <div className="table-user">
                        <div className="table-avatar">{u.name?.charAt(0).toUpperCase()}</div>
                        <span>{u.name}</span>
                        {u._id === currentUser?._id && <span className="you-badge">You</span>}
                      </div>
                    </td>
                    <td className="table-email">{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        disabled={u._id === currentUser?._id}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className={`role-select role-${u.role}`}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="table-center">{u.taskCount ?? 0}</td>
                    <td className="table-date">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button
                        className={`btn-icon btn-delete ${deleteConfirm === u._id ? 'btn-confirm' : ''}`}
                        disabled={u._id === currentUser?._id}
                        onClick={() => handleDelete(u._id)}
                        title={deleteConfirm === u._id ? 'Click again to confirm' : 'Delete user'}
                      >
                        {deleteConfirm === u._id ? '⚠️ Confirm' : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
