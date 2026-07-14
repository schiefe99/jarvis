import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGroupName } from '../contexts/GroupNameContext';
import api from '../services/api';

const CATEGORIES = [
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'pessoal', label: 'Pessoal' },
];

export default function TaskModal({ task, defaultCategory, forceShared, onSave, onClose }) {
  const { user } = useAuth();
  const { groupName } = useGroupName();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: defaultCategory || 'trabalho',
    assigned_to: '',
    due_date: '',
    shared_with_team: false,
  });
  const [members, setMembers] = useState([]);

  const autoShared = !!(form.assigned_to && user && form.assigned_to !== user.id);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        category: task.category,
        assigned_to: task.assigned_to || '',
        due_date: task.due_date ? new Date(task.due_date * 1000).toISOString().slice(0, 10) : '',
      });
    }
  }, [task]);

  useEffect(() => {
    if (form.category !== 'trabalho') return;
    api.get('/team/members').then(({ data }) => setMembers(data)).catch(() => {});
  }, [form.category]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const due_date = form.due_date ? Math.floor(new Date(form.due_date).getTime() / 1000) : null;
    const shared_with_team = !!(forceShared || autoShared || form.shared_with_team);
    onSave({ ...form, assigned_to: form.assigned_to || null, due_date, shared_with_team });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {task ? 'Editar tarefa' : 'Nova tarefa'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Título *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ex: Revisar relatório"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descrição
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Detalhes da tarefa..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Categoria
            </label>
            {task ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                {CATEGORIES.find(c => c.value === form.category)?.label}
                <span className="text-gray-400 dark:text-gray-500 font-normal"> (não pode ser alterada)</span>
              </p>
            ) : (
              <div className="flex gap-2">
                {CATEGORIES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('category', value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.category === value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {task && task.category === 'trabalho' && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                {task.shared_with_team ? `Compartilhada com "${groupName}"` : 'Pessoal — só você vê'}
              </p>
            )}
            {!task && form.category === 'trabalho' && !forceShared && (
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mt-2">
                <input
                  type="checkbox"
                  checked={form.shared_with_team || autoShared}
                  disabled={autoShared}
                  onChange={e => set('shared_with_team', e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600 flex-shrink-0"
                />
                Alocar em &quot;{groupName}&quot; <span className="text-gray-400 font-normal">(fica visível pra toda a equipe)</span>
              </label>
            )}
          </div>

          {form.category === 'trabalho' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Atribuir a
              </label>
              <select
                value={form.assigned_to}
                onChange={e => set('assigned_to', e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Ninguém</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prazo <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => set('due_date', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              {task ? 'Salvar' : 'Criar tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
