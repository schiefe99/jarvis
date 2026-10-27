import { Check, Pencil, Trash2 } from 'lucide-react';

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function DailyTaskCard({ task, onToggle, onEdit, onDelete }) {
  const today = new Date().getDay();
  const scheduledToday = task.weekdays.includes(today);

  return (
    <div className="card-glass p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-gray-900 dark:text-white leading-snug ${task.done_today ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
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
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Editar"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Excluir"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {WEEKDAY_LABELS.map((label, i) => (
          <span
            key={i}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
              task.weekdays.includes(i)
                ? i === today
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-white/20'
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      {scheduledToday ? (
        <button
          onClick={onToggle}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
            task.done_today
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
          }`}
        >
          <Check size={14} /> {task.done_today ? 'Concluída hoje' : 'Marcar como feita hoje'}
        </button>
      ) : (
        <p className="text-xs text-center text-gray-400 dark:text-white/30 py-2">
          Não repete hoje
        </p>
      )}
    </div>
  );
}
