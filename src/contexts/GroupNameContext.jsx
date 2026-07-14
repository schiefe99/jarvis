import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const GroupNameContext = createContext(null);

export function GroupNameProvider({ children }) {
  const { user } = useAuth();
  const [groupName, setGroupNameState] = useState('Grupo');

  useEffect(() => {
    if (!user) return;
    api.get('/settings/group-name').then(({ data }) => setGroupNameState(data.name)).catch(() => {});
  }, [user]);

  async function updateGroupName(name) {
    const { data } = await api.put('/settings/group-name', { name });
    setGroupNameState(data.name);
  }

  return (
    <GroupNameContext.Provider value={{ groupName, updateGroupName }}>
      {children}
    </GroupNameContext.Provider>
  );
}

export function useGroupName() {
  return useContext(GroupNameContext);
}
