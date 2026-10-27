import { CalendarClock, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const WEEKDAYS = [
  { value: 0, short: 'D', label: 'Domingo' },
  { value: 1, short: 'S', label: 'Segunda' },
  { value: 2, short: 'T', label: 'Terça' },
  { value: 3, short: 'Q', label: 'Quarta' },
  { value: 4, short: 'Q', label: 'Quinta' },
  { value: 5, short: 'S', label: 'Sexta' },
  { value: 6, short: 'S', label: 'Sábado' },
];

const WEEKDAY_VALUES = WEEKDAYS.map(d => d.value);
const WEEKDAY_SET = value => JSON.stringify([...value].sort());

const PRESETS = [
  { label: 'Todos os dias', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Dias úteis', days: [1, 2, 3, 4, 5] },
  { label: 'Fim de semana', days: [0, 6] },
];

export default function DailyTaskModal({ task, onSave, onClose }) {
  const [form, setForm] = useState({ title: '', description: '', weekdays: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        weekdays: task.weekdays || [],
      });
    }
  }, [task]);

  // Fecha com ESC
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Trava o scroll do fundo enquanto o modal está aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function toggleDay(day) {
    setForm(f => ({
      ...f,
      weekdays: f.weekdays.includes(day)
        ? f.weekdays.filter(d => d !== day)
        : [...f.weekdays, day].sort(),
    }));
  }

  function applyPreset(days) {
    setForm(f => ({ ...f, weekdays: WEEKDAY_SET(f.weekdays) === WEEKDAY_SET(days) ? [] : [...days].sort() }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || form.weekdays.length === 0 || saving) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = form.title.trim() && form.weekdays.length > 0;
  const allSelected = WEEKDAY_SET(form.weekdays) === WEEKDAY_SET(WEEKDAY_VALUES);

  // createPortal: monta o modal direto no <body>, fora da sidebar.
  // Sem isso o `fixed` se ancora na sidebar (que tem backdrop-filter e transform),
  // e o modal fica preso na coluna da esquerda em vez de centralizar na tela.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-modal-fade"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-modal-pop">
        <div className="flex items-center gap-3 p-5 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <CalendarClock size={18} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
            {task ? 'Editar tarefa diária' : 'Nova tarefa diária'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Título *
            </label>
            <input
              type="text"
              autoFocus
              required
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ex: Beber água"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Descrição <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="Detalhes da tarefa..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Repetir nos dias *
              </label>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {form.weekdays.length === 0
                  ? 'nenhum dia'
                  : allSelected
                  ? 'todos os dias'
                  : `${form.weekdays.length} dia${form.weekdays.length > 1 ? 's' : ''}`}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {WEEKDAYS.map(({ value, short, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleDay(value)}
                  title={label}
                  className={`aspect-square rounded-full text-sm font-semibold border transition-colors ${
                    form.weekdays.includes(value)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  {short}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {PRESETS.map(({ label, days }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => applyPreset(days)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    WEEKDAY_SET(form.weekdays) === WEEKDAY_SET(days)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700'
                      : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {form.weekdays.length === 0 && (
              <p className="text-xs text-red-500 mt-2">Selecione ao menos um dia</p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {saving ? 'Salvando...' : task ? 'Salvar' : 'Criar tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
