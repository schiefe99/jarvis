import { Navigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';

export default function ProfileRoute({ children }) {
  const { profile } = useProfile();
  return profile ? children : <Navigate to="/select-profile" replace />;
}
