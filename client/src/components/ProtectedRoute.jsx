/**
 * ProtectedRoute.jsx
 * SRS NFR2: Protected routes shall require authentication.
 * SRS §2.3: Role-based access distinguishes citizens and authority users.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './Loader';

const ProtectedRoute = ({ children, requireAuthority = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAuthority && user.role === 'citizen') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
