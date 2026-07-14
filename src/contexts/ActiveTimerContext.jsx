import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const ActiveTimerContext = createContext(null);

export function ActiveTimerProvider({ children }) {
  const { user } = useAuth();
  const [activeTask, setActiveTaskState] = useState(null);
  // lastUpdate is used by TasksPage to sync without re-fetching
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get('/tasks').then(({ data }) => {
      const running = data.find(t => t.timer_active === 1);
      if (running) setActiveTaskState(running);
    }).catch(() => {});
  }, [user]);

  function setActiveTask(task) {
    setActiveTaskState(task);
    setLastUpdate(task);
  }

  function clearActiveTask(updatedTask = null) {
    setActiveTaskState(null);
    if (updatedTask) setLastUpdate(updatedTask);
  }

  return (
    <ActiveTimerContext.Provider value={{ activeTask, setActiveTask, clearActiveTask, lastUpdate }}>
      {children}
    </ActiveTimerContext.Provider>
  );
}

export function useActiveTimer() {
  return useContext(ActiveTimerContext);
}
