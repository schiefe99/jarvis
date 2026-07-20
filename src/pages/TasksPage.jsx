import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import { useActiveTimer } from '../contexts/ActiveTimerContext';
import api from '../services/api';

const CATEGORY_LABEL = { trabalho: 'Trabalho', pessoal: 'Pessoal' };
const STATUS_FILTER = [
  { value: '', label: 'Todas' },
  { value: 'nao_iniciada', label: 'Não iniciadas' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida', label: 'Concluídas' },
];

export default function TasksPage() {
  const location = useLocation();
  const category = new URLSearchParams(location.search).get('category') || 'trabalho';

  const { lastUpdate } = useActiveTimer();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Sync task updated by FloatingTimer without re-fetching
  useEffect(() => {
    if (!lastUpdate) return;
    setTasks(ts => ts.map(t => t.id === lastUpdate.id ? lastUpdate : t));
  }, [lastUpdate]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { category };
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/tasks', { params });
      setTasks(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [category, statusFilter, search]);

  useEffect(() => {
    setSearch('');
    setStatusFilter('');
  }, [category]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  function openCreate() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  async function handleSave(form) {
    if (editingTask) {
      const { data } = await api.put(`/tasks/${editingTask.id}`, form);
      setTasks(ts => ts.map(t => t.id === data.id ? data : t));
      return data;
    }
    const { data } = await api.post('/tasks', { ...form, category });
    setTasks(ts => [data, ...ts]);
    return data;
  }

  async function handleDelete(id) {
    if (!confirm('Excluir esta tarefa?')) return;
    await api.delete(`/tasks/${id}`);
    setTasks(ts => ts.filter(t => t.id !== id));
  }

  function handleUpdate(updated) {
    setTasks(ts => ts.map(t => t.id === updated.id ? updated : t));
  }

  const counts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const sortedTasks = [...tasks].sort((a, b) => (a.status === 'concluida') - (b.status === 'concluida'));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {CATEGORY_LABEL[category]}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''}
            {counts.em_andamento ? ` · ${counts.em_andamento} em andamento` : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
        >
          <Plus size={16} /> Nova tarefa
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative w-full sm:flex-1 sm:min-w-52">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tarefas..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1 card-glass p-1 overflow-x-auto sm:overflow-visible">
          {STATUS_FILTER.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-glass p-5 h-48 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mx-auto flex items-center justify-center mb-4">
            <Plus size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma tarefa encontrada</p>
          <button onClick={openCreate} className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline">
            Criar primeira tarefa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={handleUpdate}
              onDelete={() => handleDelete(task.id)}
              onEdit={() => openEdit(task)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <TaskModal
          task={editingTask}
          defaultCategory={category}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
