import { BarChart3, Briefcase, CalendarCheck, ChevronDown, ChevronRight, Home, Plus, TrendingUp, User, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroupName } from '../contexts/GroupNameContext';
import { useProfile } from '../contexts/ProfileContext';
import api from '../services/api';
import GroupModal from './GroupModal';
import ProjectModal from './ProjectModal';

const SECTIONS = [
  {
    label: 'Tarefas',
    links: [
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

function ExpandableEntry({ name, icon: Icon, homeTo, isHomeActive, projects, expanded, onToggle, projectPath, isProjectActive, onNewProject }) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <NavLink
          to={homeTo}
          className={() =>
            `flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isHomeActive
                ? 'bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-white border border-blue-100 dark:border-white/10'
                : 'text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
            }`
          }
        >
          <Icon size={18} />
          <span className="truncate">{name}</span>
        </NavLink>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0"
          title="Projetos"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1 mt-1 ml-4 pl-2 border-l border-gray-200 dark:border-white/10">
          {projects.map(p => (
            <NavLink
              key={p.id}
              to={projectPath(p.id)}
              className={() =>
                `px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                  isProjectActive(p.id)
                    ? 'bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-white'
                    : 'text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                }`
              }
            >
              {p.name}
            </NavLink>
          ))}
          <button
            onClick={onNewProject}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Plus size={14} /> Novo projeto
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { groupName } = useGroupName();
  const category = new URLSearchParams(location.search).get('category');

  const [projects, setProjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [terconExpanded, setTerconExpanded] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());
  const [projectModalGroupId, setProjectModalGroupId] = useState(undefined);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  useEffect(() => {
    if (profile !== 'jarvis') return;
    api.get('/projects').then(({ data }) => setProjects(data)).catch(() => {});
    api.get('/groups').then(({ data }) => setGroups(data)).catch(() => {});
  }, [profile]);

  function toggleGroupExpanded(groupId) {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function handleProjectCreated(project) {
    setProjects(ps => [project, ...ps]);
    const openedForGroupId = projectModalGroupId;
    setProjectModalGroupId(undefined);
    if (openedForGroupId) {
      setExpandedGroupIds(prev => new Set(prev).add(openedForGroupId));
      navigate(`/group/g/${openedForGroupId}/project/${project.id}`);
    } else {
      setTerconExpanded(true);
      navigate(`/group/project/${project.id}`);
    }
  }

  function handleGroupCreated(group) {
    setGroups(gs => [group, ...gs]);
    setGroupModalOpen(false);
    navigate(`/group/g/${group.id}`);
  }

  function isActive(link) {
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

  const terconProjects = projects.filter(p => !p.group_id);

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
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider mb-2 px-2">
            Tarefas
          </p>
          <div className="flex flex-col gap-1">
            {profile === 'jarvis' ? (
              <ExpandableEntry
                name={groupName}
                icon={Home}
                homeTo="/group"
                isHomeActive={location.pathname === '/group'}
                projects={terconProjects}
                expanded={terconExpanded}
                onToggle={() => setTerconExpanded(e => !e)}
                projectPath={id => `/group/project/${id}`}
                isProjectActive={id => location.pathname === `/group/project/${id}`}
                onNewProject={() => setProjectModalGroupId(null)}
              />
            ) : (
              <NavLink
                to="/group"
                className={() =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === '/group'
                      ? 'bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-white border border-blue-100 dark:border-white/10'
                      : 'text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                  }`
                }
              >
                <Home size={18} />
                Grupo
              </NavLink>
            )}

            {profile === 'jarvis' && groups.map(g => (
              <ExpandableEntry
                key={g.id}
                name={g.name}
                icon={Home}
                homeTo={`/group/g/${g.id}`}
                isHomeActive={location.pathname === `/group/g/${g.id}`}
                projects={projects.filter(p => p.group_id === g.id)}
                expanded={expandedGroupIds.has(g.id)}
                onToggle={() => toggleGroupExpanded(g.id)}
                projectPath={id => `/group/g/${g.id}/project/${id}`}
                isProjectActive={id => location.pathname === `/group/g/${g.id}/project/${id}`}
                onNewProject={() => setProjectModalGroupId(g.id)}
              />
            ))}

            {profile === 'jarvis' && (
              <button
                onClick={() => setGroupModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Plus size={16} /> Novo grupo
              </button>
            )}

            {visibleSections[0]?.links.map(({ to, icon: Icon, label: linkLabel, match }) => (
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
                {linkLabel}
              </NavLink>
            ))}
          </div>
        </div>

        {visibleSections.slice(1).map(({ label, links }) => (
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
                  {linkLabel}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </aside>

      {projectModalGroupId !== undefined && (
        <ProjectModal
          groupId={projectModalGroupId}
          onCreated={handleProjectCreated}
          onClose={() => setProjectModalGroupId(undefined)}
        />
      )}
      {groupModalOpen && (
        <GroupModal onCreated={handleGroupCreated} onClose={() => setGroupModalOpen(false)} />
      )}
    </>
  );
}
