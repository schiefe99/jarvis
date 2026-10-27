import { Plus } from 'lucide-react';
import { useState } from 'react';
import DailyTaskCard from '../components/DailyTaskCard';
import DailyTaskModal from '../components/DailyTaskModal';
import { useDailyTasks } from '../contexts/DailyTasksContext';

export default function DailyTasksPage() {
  const { tasks, loading, createTask, updateTask, deleteTask, toggleTask } = useDailyTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

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

  const today = new Date().getDay();
  const sortedTasks = [...tasks].sort((a, b) => {
    const aToday = a.weekdays.includes(today) ? 0 : 1;
    const bToday = b.weekdays.includes(today) ? 0 : 1;
    return aToday - bToday;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tarefas diárias</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''} recorrente{tasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
        >
          <Plus size={16} /> Nova tarefa diária
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-glass p-5 h-40 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mx-auto flex items-center justify-center mb-4">
            <Plus size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma tarefa diária cadastrada</p>
          <button onClick={openCreate} className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline">
            Criar primeira tarefa diária
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTasks.map(task => (
            <DailyTaskCard
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task.id)}
              onEdit={() => openEdit(task)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </div>
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
