import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem('user');
      return s ? JSON.parse(s) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  // a sessão salva pode estar desatualizada (ex.: virou convidado depois do login) — revalida com o servidor
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/me').then(({ data }) => {
      if (!data?.id) return;
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
    }).catch(() => {});
  }, []);

  // Se a API estiver mal configurada (ex.: devolve o index.html), não salva lixo no localStorage.
  function saveSession(data) {
    if (!data?.token || !data?.user) {
      throw new Error('Resposta inválida do servidor. Verifique VITE_API_URL.');
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    saveSession(data);
  }

  async function register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password });
    saveSession(data);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
