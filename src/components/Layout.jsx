import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AiChat from './AiChat';
import FloatingTimer from './FloatingTimer';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="grain-overlay min-h-screen bg-slate-100 dark:bg-brand-ink">
      <Navbar onMenuClick={() => setMenuOpen(o => !o)} />
      <div className="flex">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
      <FloatingTimer />
      <AiChat />
    </div>
  );
}
