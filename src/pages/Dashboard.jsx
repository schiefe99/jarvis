import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie,
  PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import AiSummaryCard from '../components/AiSummaryCard';
import MetricCard from '../components/MetricCard';
import { useProfile } from '../contexts/ProfileContext';
import { formatTime } from '../hooks/useTimer';
import api from '../services/api';

const STATUS_COLORS = {
  nao_iniciada: '#94a3b8',
  em_andamento: '#3b82f6',
  concluida: '#22c55e',
};

const STATUS_LABEL = {
  nao_iniciada: 'Não iniciadas',
  em_andamento: 'Em andamento',
  concluida: 'Concluídas',
};

const CATEGORY_COLORS = { trabalho: '#a855f7', pessoal: '#f97316' };

export default function Dashboard() {
  const { profileData } = useProfile();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/dashboard/metrics', { params: { category: profileData?.category } })
      .then(({ data }) => setMetrics(data))
      .finally(() => setLoading(false));
  }, [profileData]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card-glass h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const statusPieData = [
    { name: STATUS_LABEL.nao_iniciada, value: metrics.counts.nao_iniciada, color: STATUS_COLORS.nao_iniciada },
    { name: STATUS_LABEL.em_andamento, value: metrics.counts.em_andamento, color: STATUS_COLORS.em_andamento },
    { name: STATUS_LABEL.concluida, value: metrics.counts.concluida, color: STATUS_COLORS.concluida },
  ].filter(d => d.value > 0);

  const categoryBarData = metrics.categoryStats.map(s => ({
    name: s.category === 'trabalho' ? 'Trabalho' : 'Pessoal',
    'Tempo médio (min)': Math.round(s.avg_time / 60),
    Tarefas: s.count,
    fill: CATEGORY_COLORS[s.category],
  }));

  const timelineData = metrics.timeline.map(d => ({
    date: d.day?.slice(5),
    Concluídas: d.count,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Visão geral das suas tarefas</p>
      </div>

      <AiSummaryCard category={profileData?.category} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Não iniciadas"
          value={metrics.counts.nao_iniciada}
          color="orange"
        />
        <MetricCard
          label="Em andamento"
          value={metrics.counts.em_andamento}
          color="blue"
        />
        <MetricCard
          label="Concluídas"
          value={metrics.counts.concluida}
          color="green"
        />
        <MetricCard
          label="Conclusão"
          value={`${metrics.completionRate}%`}
          sub={`${metrics.total} tarefas total`}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetricCard
          label="Tempo médio por tarefa"
          value={formatTime(metrics.avgTime)}
          sub="Tarefas concluídas"
          color="blue"
        />
        <MetricCard
          label="Tempo total gasto"
          value={formatTime(metrics.totalTime)}
          sub="Soma de todas as tarefas"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-glass p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Tarefas por status</h3>
          {statusPieData.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                  {statusPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Tarefas']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-glass p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Tempo médio por categoria</h3>
          {categoryBarData.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryBarData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" min" />
                <Tooltip formatter={(v) => [`${v} min`, 'Tempo médio']} />
                <Bar dataKey="Tempo médio (min)" radius={[6, 6, 0, 0]}>
                  {categoryBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card-glass p-5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Tarefas concluídas — últimos 30 dias
        </h3>
        {timelineData.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
            Nenhuma tarefa concluída no período
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="Concluídas"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
