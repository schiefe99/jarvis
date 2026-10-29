import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGroupName } from '../contexts/GroupNameContext';
import api from '../services/api';
import MultiUserSelect from './MultiUserSelect';

const CATEGORIES = [
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'pessoal', label: 'Pessoal' },
];

const MAX_CHECKLIST = 10;

// route params, <select> values and API ids mix strings and numbers — always compare/store as a string key
function groupKey(v) {
  return v === 'tercon' || v === '' || v == null ? null : String(v);
}

export default function TaskModal({ task, defaultCategory, defaultGroupId, defaultProjectId, onSave, onClose }) {
  const { user } = useAuth();
  const { groupName } = useGroupName();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: defaultCategory || 'trabalho',
    assignee_ids: [],
    due_date: '',
    group_id: defaultGroupId || '',
    project_id: defaultProjectId || '',
  });
  const [checklist, setChecklist] = useState([]);
  const [checklistInput, setChecklistInput] = useState('');
  const [groups, setGroups] = useState([]);
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);

  const autoShared = !!(user && form.assignee_ids.some(id => id !== user.id));
  const groupSelection = form.group_id || (autoShared ? 'tercon' : '');
  const isSharing = groupSelection !== '';

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        category: task.category,
        assignee_ids: (task.assignees || []).map(a => a.id),
        due_date: task.due_date ? new Date(task.due_date * 1000).toISOString().slice(0, 10) : '',
        group_id: task.group_id || (task.shared_with_team ? 'tercon' : ''),
        project_id: task.project_id || '',
      });
      setChecklist((task.steps || []).map(s => ({ id: s.id, title: s.title, done: !!s.done, _persisted: true })));
    }
  }, [task]);

  useEffect(() => {
    if (form.category !== 'trabalho') return;
    api.get('/groups').then(({ data }) => setGroups(data)).catch(() => {});
    api.get('/projects').then(({ data }) => setProjects(data)).catch(() => {});
  }, [form.category]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function changeGroup(value) {
    setForm(f => ({ ...f, group_id: value, project_id: '' }));
  }

  function addChecklistItem() {
    const title = checklistInput.trim();
    if (!title || checklist.length >= MAX_CHECKLIST) return;
    setChecklist(c => [...c, { id: crypto.randomUUID(), title, done: false, _persisted: false }]);
    setChecklistInput('');
  }

  function toggleChecklistItem(id) {
    setChecklist(c => c.map(i => i.id === id ? { ...i, done: !i.done } : i));
  }

  function removeChecklistItem(id) {
    setChecklist(c => c.filter(i => i.id !== id));
  }

  async function syncChecklist(taskId) {
    const original = task?.steps || [];
    const currentPersistedIds = new Set(checklist.filter(i => i._persisted).map(i => i.id));

    for (const orig of original) {
      if (!currentPersistedIds.has(orig.id)) {
        await api.delete(`/tasks/${taskId}/steps/${orig.id}`);
      }
    }
    for (const item of checklist) {
      if (!item._persisted) {
        await api.post(`/tasks/${taskId}/steps`, { title: item.title });
      }
    }
    for (const item of checklist) {
      if (item._persisted) {
        const orig = original.find(s => s.id === item.id);
        if (orig && !!orig.done !== item.done) {
          await api.put(`/tasks/${taskId}/steps/${item.id}`, { done: item.done });
        }
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const due_date = form.due_date ? Math.floor(new Date(form.due_date).getTime() / 1000) : null;
      const shared_with_team = isSharing;
      const key = groupKey(groupSelection);
      const group_id = isSharing && key ? Number(key) : null;
      const project_id = isSharing && form.project_id ? form.project_id : null;
      const saved = await onSave({ ...form, due_date, shared_with_team, group_id, project_id });
      await syncChecklist(saved.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const showGroupField = form.category === 'trabalho' && !defaultGroupId;
  const showProjectField = form.category === 'trabalho' && (isSharing || (task && task.project_name));
  const projectsForGroup = projects.filter(p => groupKey(p.group_id) === groupKey(groupSelection));

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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Lista de verificação <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <span className="text-xs text-gray-400 dark:text-gray-500">{checklist.length}/{MAX_CHECKLIST}</span>
            </div>
            {checklist.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="w-4 h-4 rounded accent-blue-600 flex-shrink-0"
                    />
                    <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      {item.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {checklist.length < MAX_CHECKLIST && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={checklistInput}
                  onChange={e => setChecklistInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                  placeholder="Adicionar item..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
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
          </div>

          {form.category === 'trabalho' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grupo
              </label>
              {task ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                  {task.group_name || (task.shared_with_team ? groupName : 'Nenhum — pessoal, só você vê')}
                </p>
              ) : showGroupField ? (
                <select
                  value={groupSelection}
                  onChange={e => changeGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled={autoShared}>Nenhum</option>
                  {!user?.is_guest && <option value="tercon">{groupName}</option>}
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                  {defaultGroupId === 'tercon' ? groupName : groups.find(g => groupKey(g.id) === groupKey(defaultGroupId))?.name || '...'}
                </p>
              )}
            </div>
          )}

          {form.category === 'trabalho' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Responsáveis
              </label>
              <MultiUserSelect value={form.assignee_ids} onChange={ids => set('assignee_ids', ids)} />
            </div>
          )}

          {showProjectField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Projeto <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              {task ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                  {task.project_name || 'Nenhum'}
                </p>
              ) : (
                <select
                  value={form.project_id}
                  onChange={e => set('project_id', e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhum</option>
                  {projectsForGroup.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
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
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {saving ? 'Salvando...' : task ? 'Salvar' : 'Criar tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
