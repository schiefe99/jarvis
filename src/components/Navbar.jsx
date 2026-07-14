import { LogOut, Menu, Moon, Repeat, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { profileData, clearProfile } = useProfile();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    clearProfile();
  }

  return (
    <header className="h-16 card-glass border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-4 sm:px-6 lg:px-10 relative z-10">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-lg text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors lg:hidden"
          title="Menu"
        >
          <Menu size={20} />
        </button>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
          <span className="text-white font-bold text-sm">Js</span>
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate">{profileData?.name}</h1>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <button
          onClick={() => navigate('/select-profile')}
          className="p-2 rounded-lg text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          title="Trocar perfil"
        >
          <Repeat size={18} />
        </button>

        <button
          onClick={toggle}
          className="p-2 rounded-lg text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          title={dark ? 'Modo claro' : 'Modo escuro'}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-white/80">{user?.name}</span>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-gray-500 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          title="Sair"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
