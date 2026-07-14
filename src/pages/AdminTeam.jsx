import { Plus, ShieldCheck, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AdminTeam() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  async function fetchMembers() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setMembers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMembers(); }, []);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setInviteResult(null);
    try {
      const { data } = await api.post('/admin/users', form);
      setForm({ name: '', email: '' });
      setInviteResult(data);
      fetchMembers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conta');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(member) {
    if (!confirm(`Excluir ${member.name}? Essa ação não pode ser desfeita.`)) return;
    await api.delete(`/admin/users/${member.id}`);
    fetchMembers();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Equipe</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Gerencie quem tem acesso ao Jarvis
        </p>
      </div>

      <div className="card-glass p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Nova pessoa</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          {error && (
            <div className="sm:col-span-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          <input
            type="text"
            required
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Nome"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            required
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium text-sm transition-colors"
          >
            <Plus size={16} /> {saving ? 'Enviando convite...' : 'Enviar convite'}
          </button>
        </form>

        {inviteResult && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm">
            {inviteResult.emailSent ? (
              <p className="text-green-700 dark:text-green-400">
                Convite enviado por e-mail pra {inviteResult.email}.
              </p>
            ) : (
              <div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  E-mail não configurado ainda — copie o link e envie manualmente pra {inviteResult.email}:
                </p>
                <input
                  readOnly
                  value={inviteResult.inviteLink}
                  onFocus={e => e.target.select()}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card-glass overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />)}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{m.name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{m.email}</p>
                </div>
                {m.is_admin ? (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex-shrink-0">
                    <ShieldCheck size={12} /> Admin
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">
                    <User size={12} /> Membro
                  </span>
                )}
                {!m.is_admin && (
                  <button
                    onClick={() => handleDelete(m)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
