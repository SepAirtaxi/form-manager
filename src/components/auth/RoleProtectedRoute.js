// src/components/auth/RoleProtectedRoute.js
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function RoleProtectedRoute({ allowedRoles }) {
  const { currentUser, userRole, hasRole, loading } = useAuth();
  const location = useLocation();

  // If auth is still loading, don't render anything yet
  if (loading) {
    return <div>Loading...</div>;
  }

  // Not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has the required role
  if (!hasRole(allowedRoles)) {
    console.log("User doesn't have required role. User role:", userRole, "Required roles:", allowedRoles);
    
    // User doesn't have the required role(s)
    // Redirect based on their role
    if (userRole === 'employee') {
      return <Navigate to="/dashboard" replace />;
    } else if (userRole === 'manager' || userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // User is authenticated and has the required role(s)
  return <Outlet />;
}

export default RoleProtectedRoute;