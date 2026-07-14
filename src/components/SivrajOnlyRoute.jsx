import { Navigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';

export default function SivrajOnlyRoute({ children }) {
  const { profile } = useProfile();
  return profile === 'sivraj' ? children : <Navigate to="/tasks?category=trabalho" replace />;
}
