import { AlertTriangle, Check, Pencil, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AiSummaryCard from '../components/AiSummaryCard';
import ChatPanel from '../components/ChatPanel';
import MetricCard from '../components/MetricCard';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import { useActiveTimer } from '../contexts/ActiveTimerContext';
import { useGroupName } from '../contexts/GroupNameContext';
import { useProfile } from '../contexts/ProfileContext';
import api from '../services/api';

export default function GroupPage() {
  const { profileData } = useProfile();
  const category = profileData?.category;
  // Sivraj (pessoal) não tem conceito de compartilhamento — só Jarvis (trabalho) tem um pool de equipe
  const scope = category === 'trabalho' ? 'team' : undefined;
  const { lastUpdate } = useActiveTimer();
  const { groupName, updateGroupName } = useGroupName();

  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    if (!lastUpdate) return;
    setTasks(ts => ts.map(t => t.id === lastUpdate.id ? lastUpdate : t));
  }, [lastUpdate]);

  const fetchAll = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    try {
      const [tasksRes, metricsRes] = await Promise.all([
        api.get('/tasks', { params: { category, scope } }),
        api.get('/dashboard/metrics', { params: { category, scope } }),
      ]);
      setTasks(tasksRes.data);
      setMetrics(metricsRes.data);
    } finally {
      setLoading(false);
    }
  }, [category, scope]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
    } else {
      const { data } = await api.post('/tasks', { ...form, category });
      setTasks(ts => [data, ...ts]);
    }
    setModalOpen(false);
  }

  async function handleDelete(id) {
    if (!confirm('Excluir esta tarefa?')) return;
    await api.delete(`/tasks/${id}`);
    setTasks(ts => ts.filter(t => t.id !== id));
  }

  function handleUpdate(updated) {
    setTasks(ts => ts.map(t => t.id === updated.id ? updated : t));
  }

  function startEditName() {
    setNameDraft(groupName);
    setEditingName(true);
  }

  async function saveName() {
    const name = nameDraft.trim();
    if (name && name !== groupName) await updateGroupName(name);
    setEditingName(false);
  }

  const sortedTasks = [...tasks].sort((a, b) => (a.status === 'concluida') - (b.status === 'concluida'));

  const now = Math.floor(Date.now() / 1000);
  const dueSoon = tasks
    .filter(t => t.due_date && t.status !== 'concluida' && (t.due_date - now) / 86400 <= 3)
    .sort((a, b) => a.due_date - b.due_date)
    .slice(0, 5);

  if (loading && !metrics) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="card-glass h-28 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 focus:outline-none"
              />
              <button onClick={saveName} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                <Check size={18} />
              </button>
              <button onClick={() => setEditingName(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{groupName}</h2>
              <button
                onClick={startEditName}
                className="p-1 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:text-white/20 dark:hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                title="Editar nome"
              >
                <Pencil size={15} />
              </button>
            </div>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Sua central de tarefas, prazos e métricas
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
        >
          <Plus size={16} /> Nova tarefa
        </button>
      </div>

      <AiSummaryCard category={category} scope={scope} />

      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Não iniciadas" value={metrics.counts.nao_iniciada} color="orange" />
          <MetricCard label="Em andamento" value={metrics.counts.em_andamento} color="blue" />
          <MetricCard label="Concluídas" value={metrics.counts.concluida} color="green" />
          <MetricCard label="Conclusão" value={`${metrics.completionRate}%`} sub={`${metrics.total} tarefas total`} color="purple" />
        </div>
      )}

      {dueSoon.length > 0 && (
        <div className="card-glass p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white mb-3">
            <AlertTriangle size={16} className="text-orange-500" /> Prazos
          </h3>
          <div className="space-y-2">
            {dueSoon.map(t => {
              const overdue = t.due_date < now;
              const dateLabel = new Date(t.due_date * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-700 dark:text-gray-300 truncate">{t.title}</span>
                  <span className={`flex-shrink-0 font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {overdue ? 'atrasada' : 'vence'} {dateLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Tarefas</h3>
        {sortedTasks.length === 0 ? (
          <div className="card-glass text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma tarefa ainda</p>
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
      </div>

      <div className="card-glass h-96 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Assistente</span>
        </div>
        <div className="flex-1 min-h-0">
          <ChatPanel category={category} scope={scope} onTaskCreated={fetchAll} />
        </div>
      </div>

      {modalOpen && (
        <TaskModal
          task={editingTask}
          defaultCategory={category}
          forceShared={category === 'trabalho'}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
