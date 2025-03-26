// src/components/auth/ProtectedRoute.js
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function ProtectedRoute() {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  // If not logged in, redirect to login page, but save the current location
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If logged in, render the child routes
  return <Outlet />;
}

export default ProtectedRoute;