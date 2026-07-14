import { Navigate, Route, Routes } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import ProfileRoute from './components/ProfileRoute';
import SivrajOnlyRoute from './components/SivrajOnlyRoute';
import { useAuth } from './contexts/AuthContext';
import AdminTeam from './pages/AdminTeam';
import Dashboard from './pages/Dashboard';
import GroupPage from './pages/GroupPage';
import Login from './pages/Login';
import ProfileSelect from './pages/ProfileSelect';
import SetPassword from './pages/SetPassword';
import TasksPage from './pages/TasksPage';
import FinancePage from './pages/FinancePage';
import CommitmentsPage from './pages/CommitmentsPage';

const Private = ({ children }) => (
  <PrivateRoute><ProfileRoute><Layout>{children}</Layout></ProfileRoute></PrivateRoute>
);

const SivrajOnly = ({ children }) => (
  <PrivateRoute><ProfileRoute><SivrajOnlyRoute><Layout>{children}</Layout></SivrajOnlyRoute></ProfileRoute></PrivateRoute>
);

const AdminOnly = ({ children }) => (
  <PrivateRoute><ProfileRoute><AdminRoute><Layout>{children}</Layout></AdminRoute></ProfileRoute></PrivateRoute>
);

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login"    element={user ? <Navigate to="/select-profile" replace /> : <Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/select-profile" element={<PrivateRoute><ProfileSelect /></PrivateRoute>} />
      <Route path="/group"       element={<Private><GroupPage /></Private>} />
      <Route path="/tasks"       element={<Private><TasksPage /></Private>} />
      <Route path="/dashboard"   element={<Private><Dashboard /></Private>} />
      <Route path="/finance"     element={<SivrajOnly><FinancePage /></SivrajOnly>} />
      <Route path="/commitments" element={<SivrajOnly><CommitmentsPage /></SivrajOnly>} />
      <Route path="/admin/team"  element={<AdminOnly><AdminTeam /></AdminOnly>} />
      <Route path="*" element={<Navigate to={user ? '/select-profile' : '/login'} replace />} />
    </Routes>
  );
}
