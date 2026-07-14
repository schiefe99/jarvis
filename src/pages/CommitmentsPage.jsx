import { AlertTriangle, ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import CommitmentModal from '../components/CommitmentModal';
import api from '../services/api';
import {
  currentMonth, formatCurrency, formatMonth,
  getCategoryColor, getCategoryLabel, nextMonth, prevMonth,
} from '../utils/categories';

function MonthSelector({ month, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(prevMonth(month))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><ChevronLeft size={18} /></button>
      <span className="text-base font-semibold text-gray-900 dark:text-white min-w-24 text-center">{formatMonth(month)}</span>
      <button onClick={() => onChange(nextMonth(month))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><ChevronRight size={18} /></button>
    </div>
  );
}

function BudgetBar({ salary, totalExpenses, totalCommitted }) {
  const totalUsed = totalExpenses + totalCommitted;
  const remaining = salary - totalUsed;
  const usedPct = salary > 0 ? Math.min(100, (totalUsed / salary) * 100) : 0;
  const expPct  = salary > 0 ? Math.min(100, (totalExpenses / salary) * 100) : 0;
  const comPct  = salary > 0 ? Math.min(Math.max(0, 100 - expPct), (totalCommitted / salary) * 100) : 0;

  const status = remaining < 0 ? 'red' : usedPct >= 80 ? 'orange' : 'green';
  const statusLabel = {
    green: 'Orçamento saudável',
    orange: 'Atenção — acima de 80%',
    red: 'Perigo — salário insuficiente!',
  }[status];

  const barColor = { green: 'bg-green-500', orange: 'bg-orange-500', red: 'bg-red-500' }[status];
  const textColor = { green: 'text-green-600 dark:text-green-400', orange: 'text-orange-500 dark:text-orange-400', red: 'text-red-600 dark:text-red-400' }[status];
  const bgColor   = { green: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800', orange: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800', red: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' }[status];

  return (
    <div className={`rounded-2xl border p-6 mb-6 ${bgColor}`}>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Saúde do orçamento</h3>
          <div className={`flex items-center gap-1.5 mt-0.5 text-sm font-medium ${textColor}`}>
            {status !== 'green' && <AlertTriangle size={14} />}
            {statusLabel}
          </div>
        </div>
        <div className={`text-3xl font-bold ${textColor}`}>{formatCurrency(remaining)}<span className="text-sm font-normal ml-1 text-gray-500 dark:text-gray-400">disponível</span></div>
      </div>

      {/* Progress bar */}
      <div className="h-4 bg-white/60 dark:bg-gray-700/60 rounded-full overflow-hidden flex mb-3">
        <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${expPct}%` }} title={`Gastos reais: ${formatCurrency(totalExpenses)}`} />
        <div className={`h-full transition-all duration-500 ${remaining < 0 ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${comPct}%` }} title={`Comprometido: ${formatCurrency(totalCommitted)}`} />
      </div>
      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />Gastos reais</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />Comprometido</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-600 inline-block" />Livre</span>
      </div>

      {/* Number breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Salário', value: salary, color: 'text-gray-900 dark:text-white' },
          { label: 'Gastos reais', value: totalExpenses, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Comprometido', value: totalCommitted, color: 'text-orange-500 dark:text-orange-400' },
          { label: 'Disponível', value: remaining, color: textColor },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`text-sm font-bold mt-0.5 ${color}`}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CommitmentsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [commitments, setCommitments] = useState([]);
  const [budget, setBudget] = useState({ salary: 0, totalExpenses: 0, totalCommitted: 0, remaining: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState(null);

  const fetchAll = useCallback(async () => {
    const [listRes, budgetRes] = await Promise.all([
      api.get('/commitments', { params: { month } }),
      api.get('/commitments/budget', { params: { month } }),
    ]);
    setCommitments(listRes.data);
    setBudget(budgetRes.data);
  }, [month]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleSave(form) {
    if (editingCommitment) {
      await api.put(`/commitments/${editingCommitment.id}`, form);
    } else {
      await api.post('/commitments', { ...form, month });
    }
    setModalOpen(false);
    setEditingCommitment(null);
    fetchAll();
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este compromisso?')) return;
    await api.delete(`/commitments/${id}`);
    fetchAll();
  }

  // Calculate running total to detect which commitments push over budget
  let runningTotal = budget.totalExpenses;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Compromissos</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Previsão de gastos e controle de orçamento</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector month={month} onChange={setMonth} />
          <button onClick={() => { setEditingCommitment(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm">
            <Plus size={16} /> Novo compromisso
          </button>
        </div>
      </div>

      {/* Budget health */}
      <BudgetBar
        salary={budget.salary}
        totalExpenses={budget.totalExpenses}
        totalCommitted={budget.totalCommitted}
      />

      {/* Commitment list */}
      {commitments.length === 0 ? (
        <div className="card-glass p-12 text-center">
          <p className="text-gray-400 dark:text-gray-500">Nenhum compromisso em {formatMonth(month)}</p>
          <button onClick={() => setModalOpen(true)} className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline">Adicionar primeiro compromisso</button>
        </div>
      ) : (
        <div className="space-y-3">
          {commitments.map(c => {
            runningTotal += c.forecast_amount;
            const exceedsBudget = budget.salary > 0 && runningTotal > budget.salary;
            const nearLimit = budget.salary > 0 && !exceedsBudget && runningTotal > budget.salary * 0.85;

            return (
              <div key={c.id} className={`card-glass rounded-xl border-2 p-5 flex flex-col sm:flex-row sm:items-center gap-4 group transition-colors ${
                exceedsBudget
                  ? 'border-red-400 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                  : nearLimit
                  ? 'border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10'
                  : 'border-gray-200 dark:border-gray-700'
              }`}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Category color dot */}
                <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ background: getCategoryColor(c.category) }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-white">{c.title}</span>
                    {c.is_recurring ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        <RefreshCw size={10} /> Recorrente
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">{formatMonth(c.month)}</span>
                    )}
                    {c.commitment_date && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {c.is_recurring
                          ? `Todo dia ${c.commitment_date}`
                          : (() => {
                              const [y, m, d] = c.commitment_date.split('-');
                              return `${d}/${m}/${y}`;
                            })()
                        }
                      </span>
                    )}
                    {exceedsBudget && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        <AlertTriangle size={10} /> Estoura o orçamento!
                      </span>
                    )}
                    {nearLimit && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                        <AlertTriangle size={10} /> Limite próximo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{getCategoryLabel(c.category)}</span>
                    {c.notes && <span className="text-xs text-gray-400 dark:text-gray-500">· {c.notes}</span>}
                  </div>
                  {/* Cumulative progress */}
                  {budget.salary > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                        <span>Acumulado após este item</span>
                        <span className={exceedsBudget ? 'text-red-600 font-semibold' : ''}>{formatCurrency(runningTotal)} / {formatCurrency(budget.salary)}</span>
                      </div>
                      <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${exceedsBudget ? 'bg-red-500' : nearLimit ? 'bg-orange-400' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(100, (runningTotal / budget.salary) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                  <span className={`text-lg font-bold ${exceedsBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {formatCurrency(c.forecast_amount)}
                  </span>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingCommitment(c); setModalOpen(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <CommitmentModal
          commitment={editingCommitment}
          defaultMonth={month}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingCommitment(null); }}
        />
      )}
    </div>
  );
}
