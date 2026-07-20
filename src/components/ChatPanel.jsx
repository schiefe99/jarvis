import { Send } from 'lucide-react';
import { useState } from 'react';
import api from '../services/api';

export default function ChatPanel({ category, scope, project, onTaskCreated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', {
        messages: nextMessages,
        category,
        scope,
        project,
      });
      setMessages(ms => [...ms, { role: 'assistant', content: data.reply }]);
      if (data.taskCreated) onTaskCreated?.();
    } catch (err) {
      const text = err.response?.status === 503 ? 'IA não configurada ainda.' : 'Erro ao responder.';
      setMessages(ms => [...ms, { role: 'assistant', content: text }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
            Pergunte sobre suas tarefas ou peça pra criar uma nova
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-line ${
              m.role === 'user'
                ? 'ml-auto bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500 text-sm px-3 py-2 rounded-xl max-w-[85%]">
            Pensando...
          </div>
        )}
      </div>

      <form onSubmit={send} className="flex gap-2 p-3 border-t border-gray-200 dark:border-white/10 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escreva sua pergunta ou peça pra criar um ticket..."
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
