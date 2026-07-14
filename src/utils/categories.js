export const EXPENSE_CATEGORIES = [
  { value: 'alimentacao',  label: 'Alimentação',   color: '#f97316' },
  { value: 'moradia',      label: 'Moradia',        color: '#3b82f6' },
  { value: 'transporte',   label: 'Transporte',     color: '#8b5cf6' },
  { value: 'saude',        label: 'Saúde',          color: '#ef4444' },
  { value: 'lazer',        label: 'Lazer',          color: '#22c55e' },
  { value: 'educacao',     label: 'Educação',       color: '#06b6d4' },
  { value: 'vestuario',    label: 'Vestuário',      color: '#ec4899' },
  { value: 'assinaturas',  label: 'Assinaturas',    color: '#a855f7' },
  { value: 'compromissos', label: 'Compromissos',   color: '#14b8a6' },
  { value: 'outros',       label: 'Outros',         color: '#94a3b8' },
];

export const getCategoryColor = (value) =>
  EXPENSE_CATEGORIES.find(c => c.value === value)?.color ?? '#94a3b8';

export const getCategoryLabel = (value) =>
  EXPENSE_CATEGORIES.find(c => c.value === value)?.label ?? value;

export const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const formatMonth = (month) => {
  if (!month) return '';
  const [year, m] = month.split('-');
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${names[parseInt(m) - 1]} ${year}`;
};

export const prevMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
};

export const nextMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
};
