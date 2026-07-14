import { BarChart3, Briefcase, CalendarCheck, Home, TrendingUp, User, Users } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroupName } from '../contexts/GroupNameContext';
import { useProfile } from '../contexts/ProfileContext';

const SECTIONS = [
  {
    label: 'Tarefas',
    links: [
      { to: '/group',                   icon: Home,         label: null,           match: '/group',     profiles: ['jarvis', 'sivraj'] },
      { to: '/tasks?category=trabalho', icon: Briefcase,    label: 'Trabalho',     match: 'trabalho',   profiles: ['jarvis'] },
      { to: '/tasks?category=pessoal',  icon: User,         label: 'Pessoal',      match: 'pessoal',    profiles: ['sivraj'] },
      { to: '/dashboard',               icon: BarChart3,    label: 'Dashboard',    match: '/dashboard', profiles: ['jarvis', 'sivraj'] },
    ],
  },
  {
    label: 'Financeiro',
    links: [
      { to: '/finance',     icon: TrendingUp,    label: 'Finanças',     match: '/finance',     profiles: ['sivraj'] },
      { to: '/commitments', icon: CalendarCheck, label: 'Compromissos', match: '/commitments', profiles: ['sivraj'] },
    ],
  },
  {
    label: 'Administração',
    links: [
      { to: '/admin/team', icon: Users, label: 'Equipe', match: '/admin/team', profiles: ['jarvis', 'sivraj'], adminOnly: true },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { groupName } = useGroupName();
  const category = new URLSearchParams(location.search).get('category');

  function isActive(link) {
    if (link.match === '/group')       return location.pathname === '/group';
    if (link.match === '/dashboard')   return location.pathname === '/dashboard';
    if (link.match === '/finance')     return location.pathname === '/finance';
    if (link.match === '/commitments') return location.pathname === '/commitments';
    if (link.match === '/admin/team')  return location.pathname === '/admin/team';
    return category === link.match;
  }

  const visibleSections = SECTIONS
    .map(section => ({
      ...section,
      links: section.links.filter(l => l.profiles.includes(profile) && (!l.adminOnly || user?.is_admin)),
    }))
    .filter(section => section.links.length > 0);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 top-16 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] z-40 w-64 lg:static lg:top-auto lg:h-auto lg:z-auto lg:w-56 lg:min-h-[calc(100vh-4rem)] card-glass border-r border-gray-200 dark:border-white/5 p-4 flex flex-col gap-5 transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {visibleSections.map(({ label, links }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider mb-2 px-2">
              {label}
            </p>
            <div className="flex flex-col gap-1">
              {links.map(({ to, icon: Icon, label: linkLabel, match }) => (
                <NavLink
                  key={match}
                  to={to}
                  className={() =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive({ match })
                        ? 'bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-white border border-blue-100 dark:border-white/10'
                        : 'text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                    }`
                  }
                >
                  <Icon size={18} />
                  {linkLabel || groupName}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </aside>
    </>
  );
}
