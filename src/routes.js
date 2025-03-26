// src/routes.js
import React from 'react';
import { Navigate } from 'react-router-dom';

// Auth components
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Admin components
import AdminDashboard from './components/admin/AdminDashboard';
import FormEditor from './components/admin/FormEditor';
import SignatureManager from './components/admin/SignatureManager';
import CompanySettings from './components/admin/CompanySettings';

// User components
import FormList from './components/user/FormList';
import FormViewer from './components/user/FormViewer';

const routes = [
  // Default redirect to user form list
  {
    path: '/',
    element: <Navigate to="/forms" replace />
  },
  
  // Authentication
  {
    path: '/login',
    element: <Login />
  },
  
  // Admin routes (protected)
  {
    path: '/admin',
    element: <ProtectedRoute />,
    children: [
      {
        path: 'dashboard',
        element: <AdminDashboard />
      },
      {
        path: 'form/new',
        element: <FormEditor />
      },
      {
        path: 'form/edit/:formId',
        element: <FormEditor />
      },
      {
        path: 'signatures',
        element: <SignatureManager />
      },
      {
        path: 'company-settings',
        element: <CompanySettings />
      }
    ]
  },
  
  // User routes (public)
  {
    path: '/forms',
    element: <FormList />
  },
  {
    path: '/form/:formId',
    element: <FormViewer />
  }
];

export default routes;