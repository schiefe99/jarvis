import { Clock, ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useActiveTimer } from '../contexts/ActiveTimerContext';
import { formatTime, useTimer } from '../hooks/useTimer';
import { usePip } from '../hooks/usePip';
import api from '../services/api';
import TimerPipContent from './TimerPipContent';

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

export default function TaskDetailModal({ task, onUpdate, onClose }) {
  const [newTitle, setNewTitle] = useState('');
  const steps = task.steps || [];
  const doneCount = steps.filter(s => s.done).length;
  const elapsed = useTimer(task);
  const isCompleted = task.status === 'concluida';
  const { clearActiveTask } = useActiveTimer();
  const { pipSupported, pipContainer, isPipActive, openPip, closePip } = usePip();

  async function handlePause() {
    const now = Math.floor(Date.now() / 1000);
    const timerElapsed = task.timer_started_at ? now - task.timer_started_at : 0;
    const { data } = await api.put(`/tasks/${task.id}`, {
      timer_active: 0,
      timer_started_at: null,
      real_time: task.real_time + timerElapsed,
    });
    onUpdate(data);
    clearActiveTask(data);
    closePip();
  }

  async function handleFinish() {
    const now = Math.floor(Date.now() / 1000);
    const timerElapsed = task.timer_active && task.timer_started_at ? now - task.timer_started_at : 0;
    const { data } = await api.put(`/tasks/${task.id}`, {
      timer_active: 0,
      timer_started_at: null,
      real_time: task.real_time + timerElapsed,
      status: 'concluida',
      finished_at: now,
    });
    onUpdate(data);
    clearActiveTask(data);
    closePip();
  }

  async function addStep(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const { data } = await api.post(`/tasks/${task.id}/steps`, { title: newTitle.trim() });
    onUpdate(data);
    setNewTitle('');
  }

  async function toggleStep(step) {
    const { data } = await api.put(`/tasks/${task.id}/steps/${step.id}`, { done: step.done ? 0 : 1 });
    onUpdate(data);
  }

  async function deleteStep(step) {
    const { data } = await api.delete(`/tasks/${task.id}/steps/${step.id}`);
    onUpdate(data);
  }

  return (
    <>
    {createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto border-t-4 border-green-500">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[task.status]}`}>
                  {STATUS_LABEL[task.status]}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLE[task.category]}`}>
                  {task.category}
                </span>
              </div>
              <h2 className={`text-lg font-semibold text-gray-900 dark:text-white ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                {task.title}
              </h2>
              {task.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 font-mono font-semibold text-base text-gray-600 dark:text-gray-300 mt-3">
            <Clock size={15} />
            {formatTime(elapsed)}
            {!!task.timer_active && (
              <span className="text-xs font-sans font-normal text-green-600 dark:text-green-400 ml-1">
                em andamento
              </span>
            )}
            {!!task.timer_active && pipSupported && (
              <button
                onClick={() => openPip()}
                className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-sans font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Abrir cronômetro em Picture-in-Picture"
              >
                <ExternalLink size={12} />
                {isPipActive ? 'Fechar PiP' : 'PiP'}
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Etapas</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {doneCount}/{steps.length} concluídas
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-auto">
            {steps.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                Nenhuma etapa ainda
              </p>
            ) : (
              steps.map(step => (
                <div
                  key={step.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={!!step.done}
                    onChange={() => toggleStep(step)}
                    className="w-4 h-4 rounded accent-green-600 flex-shrink-0"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      step.done
                        ? 'line-through text-gray-400 dark:text-gray-500'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {step.title}
                  </span>
                  <button
                    onClick={() => deleteStep(step)}
                    className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                    title="Excluir etapa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={addStep} className="flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Nova etapa..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Adicionar
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
    )}
    {pipContainer && createPortal(
      <TimerPipContent
        task={task}
        elapsed={elapsed}
        onPause={handlePause}
        onFinish={handleFinish}
      />,
      pipContainer
    )}
    </>
  );
}
