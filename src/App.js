import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Simplified Form List component for testing
function FormList() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Copenhagen AirTaxi - Form Manager</h1>
      <h2>Available Forms</h2>
      <p>This is a simplified view of the form list. In the full application, this will display all available forms.</p>
      
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>Sample Form</h3>
        <p>Engine Inspection Form - Rev 1.0</p>
        <button style={{ padding: '8px 16px', background: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Open Form
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FormList />} />
        <Route path="/admin" element={
          <div style={{ padding: '20px' }}>
            <h1>Admin Dashboard</h1>
            <p>This would be the admin dashboard after logging in.</p>
          </div>
        } />
        <Route path="/login" element={
          <div style={{ padding: '20px' }}>
            <h1>Login Page</h1>
            <p>This would be the login page for administrators.</p>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;