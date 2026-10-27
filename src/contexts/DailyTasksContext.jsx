import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const DailyTasksContext = createContext(null);

export function DailyTasksProvider({ children }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/daily-tasks');
      setTasks(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user, refresh]);

  async function createTask(form) {
    const { data } = await api.post('/daily-tasks', form);
    setTasks(ts => [data, ...ts]);
    return data;
  }

  async function updateTask(id, form) {
    const { data } = await api.put(`/daily-tasks/${id}`, form);
    setTasks(ts => ts.map(t => (t.id === data.id ? data : t)));
    return data;
  }

  async function deleteTask(id) {
    await api.delete(`/daily-tasks/${id}`);
    setTasks(ts => ts.filter(t => t.id !== id));
  }

  async function toggleTask(id) {
    const { data } = await api.post(`/daily-tasks/${id}/toggle`);
    setTasks(ts => ts.map(t => (t.id === data.id ? data : t)));
    return data;
  }

  return (
    <DailyTasksContext.Provider value={{ tasks, loading, refresh, createTask, updateTask, deleteTask, toggleTask }}>
      {children}
    </DailyTasksContext.Provider>
  );
}

export function useDailyTasks() {
  return useContext(DailyTasksContext);
}
