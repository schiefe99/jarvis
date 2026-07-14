import { CalendarDays, CheckCircle2, Clock, ListChecks, Pause, Pencil, Play, Trash2, UserRound, Users } from 'lucide-react';
import { useState } from 'react';
import { useActiveTimer } from '../contexts/ActiveTimerContext';
import { formatTime, useTimer } from '../hooks/useTimer';
import api from '../services/api';
import TaskDetailModal from './TaskDetailModal';

const STATUS_STYLE = {
  nao_iniciada: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  em_andamento: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  concluida: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

const STATUS_LABEL = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

const CATEGORY_STYLE = {
  trabalho: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  pessoal: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
};

export default function TaskCard({ task, onUpdate, onDelete, onEdit }) {
  const { setActiveTask, clearActiveTask } = useActiveTimer();
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  async function startTimer() {
    const now = Math.floor(Date.now() / 1000);
    const { data } = await api.put(`/tasks/${task.id}`, {
      timer_active: 1,
      timer_started_at: now,
      status: 'em_andamento',
    });
    onUpdate(data);
    setActiveTask(data);
  }

  async function pauseTimer() {
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - task.timer_started_at;
    const { data } = await api.put(`/tasks/${task.id}`, {
      timer_active: 0,
      timer_started_at: null,
      real_time: task.real_time + elapsed,
    });
    onUpdate(data);
    clearActiveTask(data);
  }

  async function finishTimer() {
    const now = Math.floor(Date.now() / 1000);
    const elapsed = task.timer_active && task.timer_started_at ? now - task.timer_started_at : 0;
    const { data } = await api.put(`/tasks/${task.id}`, {
      timer_active: 0,
      timer_started_at: null,
      real_time: task.real_time + elapsed,
      status: 'concluida',
      finished_at: now,
    });
    onUpdate(data);
    clearActiveTask(data);
  }

  const elapsed = useTimer(task);
  const steps = task.steps || [];
  const doneSteps = steps.filter(s => s.done).length;
  const stepsPercent = steps.length ? Math.round((doneSteps / steps.length) * 100) : 0;

  const isCompleted = task.status === 'concluida';
  const isRunning = !!task.timer_active;

  let dueBadge = null;
  if (task.due_date) {
    const now = Math.floor(Date.now() / 1000);
    const daysLeft = Math.floor((task.due_date - now) / 86400);
    const isOverdue = task.due_date < now && !isCompleted;
    const isSoon = !isOverdue && daysLeft <= 3;
    const dueLabel = new Date(task.due_date * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    dueBadge = {
      label: dueLabel,
      className: isOverdue
        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
        : isSoon
        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
        : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-white/60',
    };
  }

  return (
    <div className={`card-glass p-5 flex flex-col gap-4 transition-all ${isCompleted ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[task.status]}`}>
              {STATUS_LABEL[task.status]}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLE[task.category]}`}>
              {task.category}
            </span>
            {task.category === 'trabalho' && task.shared_with_team && task.created_by_name && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-white/60">
                <Users size={11} /> {task.created_by_name}
              </span>
            )}
            {task.category === 'trabalho' && task.assigned_to_name && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-white/60">
                <UserRound size={11} /> {task.assigned_to_name}
              </span>
            )}
            {dueBadge && (
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${dueBadge.className}`}>
                <CalendarDays size={11} /> {dueBadge.label}
              </span>
            )}
          </div>
          <h3 className={`font-semibold text-gray-900 dark:text-white leading-snug ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => setDetailModalOpen(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            title="Detalhes e etapas"
          >
            <ListChecks size={15} />
          </button>
          {!isCompleted && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Editar"
            >
              <Pencil size={15} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Excluir"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {steps.length ? `${doneSteps}/${steps.length} etapas` : 'Sem etapas'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {stepsPercent}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${stepsPercent}%` }}
          />
        </div>
      </div>

      {!isCompleted && (
        <div className="space-y-2">
          <div className={`flex items-center gap-1.5 font-mono font-semibold text-lg ${isRunning ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <Clock size={16} />
            {formatTime(elapsed)}
          </div>

          <div className="flex gap-2">
            {isRunning ? (
              <button
                onClick={pauseTimer}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm font-medium hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors border border-yellow-200 dark:border-yellow-800"
              >
                <Pause size={14} /> Pausar
              </button>
            ) : (
              <button
                onClick={startTimer}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800"
              >
                <Play size={14} /> {task.real_time > 0 ? 'Continuar' : 'Iniciar'}
              </button>
            )}
            <button
              onClick={finishTimer}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-800"
            >
              <CheckCircle2 size={14} /> Concluir
            </button>
          </div>
        </div>
      )}

      {isCompleted && task.real_time > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <CheckCircle2 size={15} className="text-green-500" />
          Concluída em {formatTime(task.real_time)}
        </div>
      )}

      {detailModalOpen && (
        <TaskDetailModal
          task={task}
          onUpdate={onUpdate}
          onClose={() => setDetailModalOpen(false)}
        />
      )}
    </div>
  );
}
