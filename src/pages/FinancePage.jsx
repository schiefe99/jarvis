import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import ExpenseModal from '../components/ExpenseModal';
import api from '../services/api';
import {
  currentMonth, EXPENSE_CATEGORIES, formatCurrency,
  formatMonth, getCategoryColor, getCategoryLabel, nextMonth, prevMonth,
} from '../utils/categories';

function MonthSelector({ month, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(prevMonth(month))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"><ChevronLeft size={18} /></button>
      <span className="text-base font-semibold text-gray-900 dark:text-white min-w-24 text-center">{formatMonth(month)}</span>
      <button onClick={() => onChange(nextMonth(month))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"><ChevronRight size={18} /></button>
    </div>
  );
}

function MetricCard({ label, value, sub, variant = 'default' }) {
  const colors = {
    default: 'text-gray-900 dark:text-white',
    blue:    'text-blue-600 dark:text-blue-400',
    red:     'text-red-600 dark:text-red-400',
    green:   'text-green-600 dark:text-green-400',
    orange:  'text-orange-500 dark:text-orange-400',
  };
  return (
    <div className="card-glass p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[variant]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function FinancePage() {
  const [month, setMonth] = useState(currentMonth);
  const [salary, setSalary] = useState(0);
  const [salaryDefined, setSalaryDefined] = useState(false);
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState('');
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const fetchAll = useCallback(async () => {
    const [settingsRes, summaryRes, expensesRes] = await Promise.all([
      api.get('/finance/settings', { params: { month } }),
      api.get('/finance/summary', { params: { month } }),
      api.get('/finance/expenses', { params: { month } }),
    ]);
    setSalary(settingsRes.data.salary);
    setSalaryDefined(settingsRes.data.defined);
    setSummary(summaryRes.data);
    setExpenses(expensesRes.data);
  }, [month]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openSalaryEdit() {
    setSalaryInput(salaryDefined ? String(salary) : '');
    setEditingSalary(true);
  }

  async function saveSalary() {
    const val = parseFloat(salaryInput);
    if (isNaN(val) || val < 0) return;
    await api.put('/finance/settings', { salary: val, month });
    setEditingSalary(false);
    fetchAll();
  }

  async function handleSaveExpense(form) {
    if (editingExpense) {
      await api.put(`/finance/expenses/${editingExpense.id}`, form);
    } else {
      await api.post('/finance/expenses', { ...form, month });
    }
    setModalOpen(false);
    setEditingExpense(null);
    fetchAll();
  }

  async function handleDelete(id) {
    if (!confirm('Excluir esta despesa?')) return;
    await api.delete(`/finance/expenses/${id}`);
    fetchAll();
  }

  const pieData = (summary?.byCategory || []).map(row => ({
    name: getCategoryLabel(row.category),
    value: row.total,
    color: getCategoryColor(row.category),
  }));

  const remaining = salary - (summary?.totalExpenses || 0) - (summary?.totalCommitments || 0);
  const remainingVariant = remaining < 0 ? 'red' : salary > 0 && remaining < salary * 0.2 ? 'orange' : 'green';

  const groupedExpenses = EXPENSE_CATEGORIES.reduce((acc, cat) => {
    const items = expenses.filter(e => e.category === cat.value);
    if (items.length) acc.push({ cat, items, total: items.reduce((s, e) => s + e.amount, 0) });
    return acc;
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Finanças</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Controle de despesas mensais</p>
        </div>
        <div className="flex items-center flex-wrap gap-3">
          <MonthSelector month={month} onChange={setMonth} />
          <button onClick={() => { setEditingExpense(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm">
            <Plus size={16} /> Nova despesa
          </button>
        </div>
      </div>

      {/* Salary card */}
      <div className="card-glass p-5 mb-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
          <Wallet size={20} className="text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Salário de {formatMonth(month)}</p>

          {editingSalary ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">R$</span>
              <input
                autoFocus
                type="number"
                value={salaryInput}
                onChange={e => setSalaryInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveSalary(); if (e.key === 'Escape') setEditingSalary(false); }}
                placeholder="0,00"
                className="flex-1 min-w-[120px] sm:w-44 sm:flex-none px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={saveSalary} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                Salvar
              </button>
              <button onClick={() => setEditingSalary(false)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
            </div>
          ) : salaryDefined ? (
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(salary)}</span>
              <button onClick={openSalaryEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <Pencil size={14} />
              </button>
            </div>
          ) : (
            <button onClick={openSalaryEdit} className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Definir salário de {formatMonth(month)}
            </button>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Salário" value={formatCurrency(salary)} variant="blue" />
        <MetricCard label="Gastos reais" value={formatCurrency(summary?.totalExpenses)} sub={`${expenses.length} lançamentos`} />
        <MetricCard label="Comprometido" value={formatCurrency(summary?.totalCommitments)} sub="Compromissos" variant="orange" />
        <MetricCard label="Saldo livre" value={formatCurrency(remaining)} sub={salary > 0 ? `${Math.round((remaining / salary) * 100)}% do salário` : ''} variant={remainingVariant} />
      </div>

      {/* Usage bar */}
      {salary > 0 && (
        <div className="card-glass p-5 mb-6">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>Uso do salário</span>
            <span className={remaining < 0 ? 'text-red-600 font-semibold' : ''}>
              {`${Math.min(100, Math.round(((summary?.totalExpenses || 0) + (summary?.totalCommitments || 0)) / salary * 100))}%`}
            </span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
            <div className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(100, salary > 0 ? ((summary?.totalExpenses || 0) / salary * 100) : 0)}%` }} />
            <div className="h-full bg-orange-400 transition-all duration-500"
              style={{ width: `${Math.min(100, salary > 0 ? ((summary?.totalCommitments || 0) / salary * 100) : 0)}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />Gastos reais</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />Compromissos</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-600 inline-block" />Livre</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {groupedExpenses.length === 0 ? (
            <div className="card-glass p-12 text-center">
              <p className="text-gray-400 dark:text-gray-500">Nenhuma despesa em {formatMonth(month)}</p>
              <button onClick={() => setModalOpen(true)} className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline">Adicionar primeira despesa</button>
            </div>
          ) : groupedExpenses.map(({ cat, items, total }) => (
            <div key={cat.value} className="card-glass overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700" style={{ borderLeftColor: cat.color, borderLeftWidth: 4 }}>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">{cat.label}</span>
                <span className="font-bold text-gray-700 dark:text-gray-200 text-sm">{formatCurrency(total)}</span>
              </div>
              {items.map(exp => (
                <div key={exp.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{exp.title}</p>
                    {exp.notes && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{exp.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{formatCurrency(exp.amount)}</span>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingExpense(exp); setModalOpen(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(exp.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 card-glass p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Por categoria</h3>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={v => [formatCurrency(v), 'Total']} />
                <Legend formatter={(value) => <span style={{ fontSize: 12, color: 'currentColor' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {modalOpen && (
        <ExpenseModal
          expense={editingExpense}
          defaultMonth={month}
          onSave={handleSaveExpense}
          onClose={() => { setModalOpen(false); setEditingExpense(null); }}
        />
      )}
    </div>
  );
}
