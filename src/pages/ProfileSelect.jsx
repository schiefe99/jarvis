import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';

const CARDS = [
  { key: 'jarvis', title: 'Jarvis', subtitle: 'Profissional', path: '/group' },
  { key: 'sivraj', title: 'Sivraj', subtitle: 'Rotina', path: '/group' },
];

export default function ProfileSelect() {
  const { setProfile } = useProfile();
  const navigate = useNavigate();

  function choose(card) {
    setProfile(card.key);
    navigate(card.path);
  }

  return (
    <div className="grain-overlay min-h-screen bg-slate-100 dark:bg-brand-ink flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          Onde você deseja entrar?
        </h1>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          {CARDS.map(card => (
            <button
              key={card.key}
              onClick={() => choose(card)}
              className="w-56 h-56 rounded-3xl bg-purple-700 hover:bg-purple-600 dark:bg-purple-800 dark:hover:bg-purple-700 shadow-xl hover:shadow-2xl transition-all flex flex-col items-center justify-center gap-2 p-8"
            >
              <span className="text-2xl font-bold text-white">{card.title}</span>
              <span className="text-sm text-white/70">{card.subtitle}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
