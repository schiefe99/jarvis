import { Check, ListTodo, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDailyTasks } from '../contexts/DailyTasksContext';
import DailyTaskModal from './DailyTaskModal';

export default function DailyTasksPanel() {
  const navigate = useNavigate();
  const { tasks, loading, createTask, updateTask, deleteTask, toggleTask } = useDailyTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const today = new Date().getDay();

  function openCreate() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  async function handleSave(form) {
    if (editingTask) return updateTask(editingTask.id, form);
    return createTask(form);
  }

  async function handleDelete(id) {
    if (!confirm('Excluir esta tarefa diária?')) return;
    await deleteTask(id);
  }

  const todayTasks = tasks.filter(t => t.active && t.weekdays.includes(today));

  return (
    <div className="card-glass p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => navigate('/daily-tasks')}
          className="text-xs font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider flex items-center gap-1.5 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
          title="Ver todas as tarefas diárias"
        >
          <ListTodo size={13} /> Tarefas diárias
        </button>
        <button
          onClick={openCreate}
          className="p-1 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="Nova tarefa diária"
        >
          <Plus size={15} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-1.5 px-1">
          {[1, 2].map(i => (
            <div key={i} className="h-8 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : todayTasks.length === 0 ? (
        <button
          onClick={() => navigate('/daily-tasks')}
          className="text-xs text-gray-400 dark:text-white/30 px-2 py-1.5 text-left hover:text-gray-600 dark:hover:text-white/60 transition-colors"
        >
          Nenhuma tarefa para hoje
        </button>
      ) : (
        <div className="flex flex-col gap-1">
          {todayTasks.map(task => (
            <div
              key={task.id}
              className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-4 h-4 rounded-full flex-shrink-0 border flex items-center justify-center transition-colors ${
                  task.done_today
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 dark:border-white/20'
                }`}
                title={task.done_today ? 'Marcar como não feita' : 'Marcar como feita'}
              >
                {task.done_today && <Check size={11} />}
              </button>
              <button
                onClick={() => openEdit(task)}
                className={`flex-1 min-w-0 text-left text-sm truncate ${
                  task.done_today
                    ? 'line-through text-gray-400 dark:text-white/30'
                    : 'text-gray-700 dark:text-white/70'
                }`}
                title={task.title}
              >
                {task.title}
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-600 transition-all flex-shrink-0"
                title="Excluir"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <button
          onClick={() => navigate('/daily-tasks')}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 pt-1 text-left"
        >
          Ver todas ({tasks.length})
        </button>
      )}

      {modalOpen && (
        <DailyTaskModal
          task={editingTask}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
