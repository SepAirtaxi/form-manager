import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

// Auth components
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Admin components
import AdminDashboard from './components/admin/AdminDashboard';
import SignatureManager from './components/admin/SignatureManager';
import CompanySettings from './components/admin/CompanySettings';
// Import other admin components as you implement them
// import FormEditor from './components/admin/FormEditor';

// User components
import FormList from './components/user/FormList';
// Import other user components as you implement them
// import FormViewer from './components/user/FormViewer';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Default route redirects to forms */}
          <Route path="/" element={<Navigate to="/forms" replace />} />
          
          {/* User routes */}
          <Route path="/forms" element={<FormList />} />
          {/* Add form viewer route when ready */}
          {/* <Route path="/form/:formId" element={<FormViewer />} /> */}
          
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Admin routes - protected */}
          <Route path="/admin" element={<ProtectedRoute />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="signatures" element={<SignatureManager />} />
            <Route path="company-settings" element={<CompanySettings />} />
            {/* Add other admin routes as you implement them */}
            {/* <Route path="form/new" element={<FormEditor />} /> */}
            {/* <Route path="form/edit/:formId" element={<FormEditor />} /> */}
          </Route>
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/forms" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;