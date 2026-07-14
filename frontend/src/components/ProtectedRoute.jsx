import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { token, isLoading } = useAuth();

  if (isLoading) return null;
  if (!token) return <Navigate to="/login" replace />;

  return children;
}
