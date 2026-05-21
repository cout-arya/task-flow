import React, { useState, useEffect, useCallback } from 'react';
import { getTasksAPI, createTaskAPI, updateTaskAPI, deleteTaskAPI } from '../api/tasks';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';

const DashboardPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 9 };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      const res = await getTasksAPI(params);
      setTasks(res.data.data);
      setPagination((p) => ({ ...p, total: res.data.pagination.total, totalPages: res.data.pagination.totalPages }));
    } catch { showToast('Failed to load tasks.', 'error'); }
    finally { setLoading(false); }
  }, [filters, pagination.page]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreate = () => { setEditTask(null); setModalOpen(true); };
  const handleEdit = (task) => { setEditTask(task); setModalOpen(true); };
  const handleCloseModal = () => { setModalOpen(false); setEditTask(null); };

  const handleSubmit = async (data) => {
    setModalLoading(true);
    try {
      if (editTask) {
        await updateTaskAPI(editTask._id, data);
        showToast('Task updated successfully!');
      } else {
        await createTaskAPI(data);
        showToast('Task created successfully!');
      }
      handleCloseModal();
      fetchTasks();
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed.', 'error');
    } finally { setModalLoading(false); }
  };

  const handleDelete = async (id) => {
    if (deleteConfirm !== id) { setDeleteConfirm(id); setTimeout(() => setDeleteConfirm(null), 3000); return; }
    try {
      await deleteTaskAPI(id);
      showToast('Task deleted.');
      setDeleteConfirm(null);
      fetchTasks();
    } catch (err) { showToast(err.response?.data?.message || 'Delete failed.', 'error'); }
  };

  const stats = [
    { label: 'Total', value: pagination.total, icon: '📋', color: 'stat-total' },
    { label: 'Todo', value: tasks.filter(t => t.status === 'todo').length, icon: '🔵', color: 'stat-todo' },
    { label: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, icon: '🟡', color: 'stat-progress' },
    { label: 'Done', value: tasks.filter(t => t.status === 'done').length, icon: '🟢', color: 'stat-done' },
  ];

  return (
    <div className="page-container">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">My Dashboard</h1>
          <p className="page-subtitle">Welcome back, <strong>{user?.name}</strong> · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button id="create-task-btn" className="btn-primary" onClick={handleCreate}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          New Task
        </button>
      </div>

      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <span className="stat-icon">{s.icon}</span>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="filters-bar">
        <span className="filters-label">Filter:</span>
        <select id="filter-status" value={filters.status} onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select id="filter-priority" value={filters.priority} onChange={(e) => setFilters(p => ({ ...p, priority: e.target.value }))}>
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        {(filters.status || filters.priority) && (
          <button className="btn-clear" onClick={() => setFilters({ status: '', priority: '' })}>✕ Clear</button>
        )}
      </div>

      {loading ? (
        <div className="tasks-loading">
          {[...Array(6)].map((_, i) => <div key={i} className="task-skeleton" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No tasks found</h3>
          <p>Create your first task to get started!</p>
          <button className="btn-primary" onClick={handleCreate}>Create Task</button>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isConfirming={deleteConfirm === task._id}
            />
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} className="page-btn">← Prev</button>
          <span className="page-info">Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={pagination.page === pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} className="page-btn">Next →</button>
        </div>
      )}

      <TaskModal isOpen={modalOpen} onClose={handleCloseModal} onSubmit={handleSubmit} editTask={editTask} loading={modalLoading} />
    </div>
  );
};

export default DashboardPage;
