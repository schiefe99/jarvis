import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.is_admin ? children : <Navigate to="/tasks?category=trabalho" replace />;
}
