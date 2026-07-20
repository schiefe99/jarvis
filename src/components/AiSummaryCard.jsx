import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import api from '../services/api';

export default function AiSummaryCard({ category, scope, project }) {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/ai/summary', { params: { category, scope, project } });
      setSummary(data.summary);
    } catch (err) {
      setError(err.response?.status === 503 ? 'IA não configurada ainda' : 'Erro ao gerar resumo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-glass p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          <Sparkles size={16} className="text-purple-500" /> Resumo do dia
        </h3>
        <button
          onClick={generate}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {loading ? 'Gerando...' : summary ? 'Gerar de novo' : 'Gerar resumo'}
        </button>
      </div>
      {error && <p className="text-sm text-gray-400 dark:text-gray-500 mt-3">{error}</p>}
      {summary && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 whitespace-pre-line">{summary}</p>
      )}
    </div>
  );
}
