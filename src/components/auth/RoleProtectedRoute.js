// src/components/auth/RoleProtectedRoute.js
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function RoleProtectedRoute({ allowedRoles }) {
  const { currentUser, userRole, hasRole } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    // Not logged in, redirect to the login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasRole(allowedRoles)) {
    // User doesn't have the required role(s)
    // Redirect based on their role
    switch (userRole) {
      case 'employee':
        return <Navigate to="/dashboard" replace />;
      case 'manager':
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/unauthorized" replace />;
    }
  }

  // User is authenticated and has the required role(s)
  return <Outlet />;
}

export default RoleProtectedRoute;