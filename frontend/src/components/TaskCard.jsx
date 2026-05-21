import React from 'react';

const statusConfig = {
  'todo': { label: 'To Do', color: 'status-todo' },
  'in-progress': { label: 'In Progress', color: 'status-progress' },
  'done': { label: 'Done', color: 'status-done' },
};

const priorityConfig = {
  'low': { label: 'Low', color: 'priority-low', icon: '↓' },
  'medium': { label: 'Medium', color: 'priority-medium', icon: '→' },
  'high': { label: 'High', color: 'priority-high', icon: '↑' },
};

const TaskCard = ({ task, onEdit, onDelete, isConfirming }) => {
  const status = statusConfig[task.status] || statusConfig['todo'];
  const priority = priorityConfig[task.priority] || priorityConfig['medium'];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const overdue = task.dueDate && task.status !== 'done' && new Date() > new Date(task.dueDate);

  return (
    <div className={`task-card ${task.status === 'done' ? 'task-done' : ''}`}>
      <div className="task-card-header">
        <span className={`badge ${status.color}`}>{status.label}</span>
        <span className={`badge ${priority.color}`}>{priority.icon} {priority.label}</span>
      </div>
      <h3 className="task-title">{task.title}</h3>
      {task.description && <p className="task-desc">{task.description}</p>}
      <div className="task-meta">
        <span className="task-owner">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          {task.owner?.name || 'Unknown'}
        </span>
        {task.dueDate && (
          <span className={`task-due ${overdue ? 'overdue' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            {overdue ? 'Overdue · ' : ''}{formatDate(task.dueDate)}
          </span>
        )}
      </div>
      {task.tags?.length > 0 && (
        <div className="task-tags">
          {task.tags.map((tag) => <span key={tag} className="tag">#{tag}</span>)}
        </div>
      )}
      <div className="task-actions">
        <button className="btn-icon btn-edit" onClick={() => onEdit(task)} title="Edit">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Edit
        </button>
        <button className={`btn-icon btn-delete ${isConfirming ? 'btn-confirm' : ''}`} onClick={() => onDelete(task._id)} title="Delete">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          {isConfirming ? 'Confirm?' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

export default TaskCard;
