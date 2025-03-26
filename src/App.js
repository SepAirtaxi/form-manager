import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

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
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Default redirect to user form list */}
          <Route path="/" element={<Navigate to="/forms" replace />} />
          
          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          
          {/* Admin routes (protected) */}
          <Route path="/admin" element={<ProtectedRoute />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="form/new" element={<FormEditor />} />
            <Route path="form/edit/:formId" element={<FormEditor />} />
            <Route path="signatures" element={<SignatureManager />} />
            <Route path="company-settings" element={<CompanySettings />} />
          </Route>
          
          {/* User routes (public) */}
          <Route path="/forms" element={<FormList />} />
          <Route path="/form/:formId" element={<FormViewer />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;