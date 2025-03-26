// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

// Auth components
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Admin components
import AdminDashboard from './components/admin/AdminDashboard';
// We'll add these later:
// import FormEditor from './components/admin/FormEditor';
// import SignatureManager from './components/admin/SignatureManager';
// import CompanySettings from './components/admin/CompanySettings';

// User components
import FormList from './components/user/FormList';
// We'll add this later:
// import FormViewer from './components/user/FormViewer';

// Temporary placeholders for components not yet implemented
function FormEditor() {
  return <div style={{ padding: '20px', marginTop: '64px' }}><h1>Form Editor</h1><p>This is where users will create and edit forms.</p></div>;
}

function SignatureManager() {
  return <div style={{ padding: '20px', marginTop: '64px' }}><h1>Signature Manager</h1><p>This is where users will manage authorized signatories.</p></div>;
}

function CompanySettings() {
  return <div style={{ padding: '20px', marginTop: '64px' }}><h1>Company Settings</h1><p>This is where users will configure company information.</p></div>;
}

function FormViewer() {
  return <div style={{ padding: '20px', marginTop: '64px' }}><h1>Form Viewer</h1><p>This is where users will fill out and submit forms.</p></div>;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Default redirect to form list */}
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