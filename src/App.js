// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Admin components
import AdminDashboard from './components/admin/AdminDashboard';
import FormEditor from './components/admin/FormEditor';
import SignatureManager from './components/admin/SignatureManager';
import CompanySettings from './components/admin/CompanySettings';

// User components
import FormList from './components/user/FormList';
import FormViewer from './components/user/FormViewer';

// Auth components
import Login from './components/auth/Login';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Default redirect to form list */}
          <Route path="/" element={<Navigate to="/forms" replace />} />
          
          {/* Public routes */}
          <Route path="/forms" element={<FormList />} />
          <Route path="/form/:formId" element={<FormViewer />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected admin routes */}
          <Route path="/admin" element={<ProtectedRoute />}>
            <Route path="" element={<AdminDashboard />} />
            <Route path="form/new" element={<FormEditor />} />
            <Route path="form/edit/:formId" element={<FormEditor />} />
            <Route path="signatures" element={<SignatureManager />} />
            <Route path="company-settings" element={<CompanySettings />} />
          </Route>
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/forms" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;