// src/App.js
import React, { createContext, useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';

// Authentication
import { AuthProvider } from './contexts/AuthContext';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import Login from './components/auth/Login';

// Common components
import NavigationMenu from './components/common/NavigationMenu';

// User components
import UserDashboard from './components/user/UserDashboard';
import FormList from './components/user/FormList';
import FormViewer from './components/user/FormViewer';

// Admin components
import AdminDashboard from './components/admin/AdminDashboard';
import FormEditor from './components/admin/FormEditor';
import SignatureManager from './components/admin/SignatureManager';
import CompanySettings from './components/admin/CompanySettings';
import UserManager from './components/admin/UserManager';

// Unauthorized Page Component
const UnauthorizedPage = () => (
  <div style={{ padding: '20px', textAlign: 'center', marginTop: '100px' }}>
    <h1>Unauthorized Access</h1>
    <p>You don't have permission to access this resource.</p>
  </div>
);

// Create a context for draft count
const DraftCountContext = createContext(0);

// Custom hook to use the draft count context
export function useDraftCount() {
  return useContext(DraftCountContext);
}

// Component to wrap routes that should have the navigation menu
function LayoutWithNav() {
  const [draftCount, setDraftCount] = useState(0);
  
  return (
    <DraftCountContext.Provider value={{ draftCount, setDraftCount }}>
      <NavigationMenu draftCount={draftCount} />
      <Outlet />
    </DraftCountContext.Provider>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Login page (no navigation menu) */}
          <Route path="/login" element={<Login />} />
          
          {/* All other routes with navigation menu */}
          <Route element={<LayoutWithNav />}>
            {/* Root path redirects based on role (handled in RoleProtectedRoute) */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Unauthorized page */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            {/* User routes (requires employee role or higher) */}
            <Route element={<RoleProtectedRoute allowedRoles={['employee', 'manager', 'admin']} />}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/forms" element={<FormList />} />
              <Route path="/form/:formId" element={<FormViewer />} />
            </Route>
            
            {/* Admin routes (requires manager role or higher) */}
            <Route element={<RoleProtectedRoute allowedRoles={['manager', 'admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/form/new" element={<FormEditor />} />
              <Route path="/admin/form/edit/:formId" element={<FormEditor />} />
              <Route path="/admin/signatures" element={<SignatureManager />} />
              <Route path="/admin/company-settings" element={<CompanySettings />} />
            </Route>
            
            {/* Admin-only routes */}
            <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/users" element={<UserManager />} />
            </Route>
          </Route>
          
          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;