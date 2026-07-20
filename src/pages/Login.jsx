import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  function toggleMode() {
    setMode(m => (m === 'login' ? 'register' : 'login'));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'register') {
        await register(form.name, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
      navigate('/select-profile');
    } catch (err) {
      setError(err.response?.data?.error || (mode === 'register' ? 'Erro ao criar conta' : 'Erro ao fazer login'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grain-overlay min-h-screen bg-slate-100 dark:bg-brand-ink flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600 items-center justify-center mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">Js</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jarvis</h1>
          <p className="text-gray-500 dark:text-white/40 mt-1">
            {mode === 'register' ? 'Crie sua conta' : 'Faça login para continuar'}
          </p>
        </div>

        <div className="card-glass p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
              <input
                type="password"
                required
                minLength={mode === 'register' ? 6 : undefined}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {mode === 'register' && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Mínimo de 6 caracteres</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-colors mt-2"
            >
              {loading ? (mode === 'register' ? 'Criando conta...' : 'Entrando...') : (mode === 'register' ? 'Criar conta' : 'Entrar')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-white/40 mt-5">
            {mode === 'register' ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              {mode === 'register' ? 'Fazer login' : 'Criar conta'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
