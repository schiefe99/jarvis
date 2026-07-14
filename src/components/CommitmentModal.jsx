import { RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { currentMonth, EXPENSE_CATEGORIES } from '../utils/categories';

export default function CommitmentModal({ commitment, defaultMonth, onSave, onClose }) {
  const [form, setForm] = useState({
    title: '', category: 'compromissos', forecast_amount: '',
    is_recurring: false, month: defaultMonth, notes: '', commitment_date: '',
  });

  useEffect(() => {
    if (commitment) {
      setForm({
        title: commitment.title,
        category: commitment.category,
        forecast_amount: commitment.forecast_amount,
        is_recurring: !!commitment.is_recurring,
        month: commitment.month || defaultMonth,
        notes: commitment.notes || '',
        commitment_date: commitment.commitment_date || '',
      });
    }
  }, [commitment]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.forecast_amount) return;
    onSave({ ...form, forecast_amount: parseFloat(form.forecast_amount) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {commitment ? 'Editar compromisso' : 'Novo compromisso'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
            <input required type="text" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Ex: Aluguel, Academia, Streaming..." className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Previsão (R$) *</label>
              <input required type="number" min="0" step="0.01" value={form.forecast_amount} onChange={e => set('forecast_amount', e.target.value)}
                placeholder="0,00" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Recurring toggle */}
          <button type="button" onClick={() => set('is_recurring', !form.is_recurring)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${form.is_recurring ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className={form.is_recurring ? 'text-blue-600' : 'text-gray-400'} />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Recorrente</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Aplica todo mês automaticamente</p>
              </div>
            </div>
            <div className={`w-10 h-5 rounded-full transition-colors ${form.is_recurring ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} relative`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_recurring ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          {form.is_recurring ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dia do mês <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input type="number" min="1" max="31" value={form.commitment_date} onChange={e => set('commitment_date', e.target.value)}
                placeholder="Ex: 5 (todo dia 5 do mês)"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mês específico</label>
                <input type="month" value={form.month} onChange={e => set('month', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input type="date" value={form.commitment_date} onChange={e => set('commitment_date', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Opcional..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
            <button type="submit" className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
              {commitment ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
