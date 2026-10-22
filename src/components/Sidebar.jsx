import { motion } from 'framer-motion';
import {
  Sun, CalendarDays, Grid3x3, Target, Repeat, Timer, NotebookPen, Images, ChartColumn, Trophy, Settings,
} from 'lucide-react';
import { ProgressRing } from './ui.jsx';

export const NAV = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'planner', label: 'Planner', icon: CalendarDays },
  { id: 'year', label: '365', icon: Grid3x3 },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'habits', label: 'Habits', icon: Repeat },
  { id: 'focus', label: 'Focus', icon: Timer },
  { id: 'journal', label: 'Journal', icon: NotebookPen },
  { id: 'vision', label: 'Vision board', icon: Images },
  { id: 'insights', label: 'Insights', icon: ChartColumn },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ view, onNavigate, profile, stats }) {
  const initials = (profile.name || 'You')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <nav className="sidebar" aria-label="Main">
      <ul className="nav-list">
        {NAV.map((item, i) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <li key={item.id} className={item.id === 'settings' ? 'nav-settings' : undefined}>
              <button className={`nav-item${active ? ' active' : ''}`} onClick={() => onNavigate(item.id)} aria-current={active ? 'page' : undefined}>
                {active && <motion.span className="nav-pill" layoutId="nav-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <Icon />
                <span>{item.label}</span>
                {i < 9 && <kbd className="nav-key">{i + 1}</kbd>}
              </button>
            </li>
          );
        })}
      </ul>

      <button className="sb-profile" onClick={() => onNavigate('achievements')}>
        <ProgressRing value={stats.pct} size={44} stroke={2.5}>
          <span className="sb-initials">{initials}</span>
        </ProgressRing>
        <span className="sb-meta">
          <strong>{profile.name || 'You'}</strong>
          <span>
            Level {stats.level}, {stats.rank.name}
          </span>
        </span>
      </button>
    </nav>
  );
}
