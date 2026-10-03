import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Landing from './pages/Landing';
import Login from './pages/Login';
import AuthorityLogin from './pages/AuthorityLogin';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MyReports from './pages/MyReports';
import NearbyIssues from './pages/NearbyIssues';
import Report from './pages/Report';
import AuthorityDashboard from './pages/AuthorityDashboard';


import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />

        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/authority-login" element={<AuthorityLogin />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
  path="/my-reports"
  element={
    <ProtectedRoute>
      <MyReports />
    </ProtectedRoute>
  }
/>

          <Route
            path="/nearby"
            element={
              <ProtectedRoute>
                <NearbyIssues />
              </ProtectedRoute>
            }
          />

          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <Report />
              </ProtectedRoute>
            }
          />
          <Route
  path="/authority"
  element={
    <ProtectedRoute requireAuthority>
      <AuthorityDashboard />
    </ProtectedRoute>
  }
/>

          {/* Unknown route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;