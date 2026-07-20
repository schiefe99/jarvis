import { useEffect, useState } from 'react';
import api from '../services/api';

export default function MultiUserSelect({ value, onChange }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    api.get('/team/members').then(({ data }) => setMembers(data)).catch(() => {});
  }, []);

  function toggle(id) {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  }

  if (members.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum membro disponível</p>;
  }

  return (
    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2">
      {members.map(m => (
        <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={value.includes(m.id)}
            onChange={() => toggle(m.id)}
            className="w-4 h-4 rounded accent-blue-600 flex-shrink-0"
          />
          {m.name}
        </label>
      ))}
    </div>
  );
}
