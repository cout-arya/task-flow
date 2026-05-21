import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="brand-name">TaskFlow</span>
      </div>

      <div className="navbar-links">
        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>Dashboard</Link>
        {isAdmin && <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>Admin Panel</Link>}
        <a href="http://localhost:5000/api-docs" target="_blank" rel="noreferrer" className="nav-link">API Docs</a>
      </div>

      <div className="navbar-user">
        <div className="user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
        <div className="user-info">
          <span className="user-name">{user.name}</span>
          <span className={`user-role badge-${user.role}`}>{user.role}</span>
        </div>
        <button className="btn-logout" onClick={handleLogout} title="Logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
