import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 6) {
      return setError('A senha deve ter no mínimo 6 caracteres');
    }
    if (form.password !== form.confirm) {
      return setError('As senhas não coincidem');
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/set-password', { token, password: form.password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao definir senha');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="grain-overlay min-h-screen bg-slate-100 dark:bg-brand-ink flex items-center justify-center p-4">
        <div className="card-glass p-8 max-w-md text-center">
          <p className="text-gray-700 dark:text-gray-300">Link de convite inválido.</p>
          <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline mt-3 inline-block">
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grain-overlay min-h-screen bg-slate-100 dark:bg-brand-ink flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600 items-center justify-center mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">Js</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bem-vindo ao Jarvis</h1>
          <p className="text-gray-500 dark:text-white/40 mt-1">Crie sua senha para continuar</p>
        </div>

        <div className="card-glass p-8">
          {success ? (
            <p className="text-center text-green-600 dark:text-green-400 text-sm">
              Senha criada! Redirecionando pro login...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova senha</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirme a senha</label>
                <input
                  type="password"
                  required
                  value={form.confirm}
                  onChange={e => set('confirm', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-colors mt-2"
              >
                {loading ? 'Salvando...' : 'Criar senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
