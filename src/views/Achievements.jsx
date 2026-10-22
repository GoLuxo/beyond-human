import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAppState } from '../state/store.js';
import { computeStats, RANKS, XP } from '../lib/progress.js';
import { ACHIEVEMENTS } from '../lib/achievements.js';
import { Bar } from '../components/ui.jsx';
import { formatShort, ymd } from '../lib/dates.js';

const XP_RULES = [
  [XP.day, 'Light up a day'],
  [XP.task, 'Complete a task (+5 if high priority)'],
  [XP.habit, 'Check off a habit'],
  [XP.focusMinute, 'Each minute of focus'],
  [XP.journal, 'Write a journal entry'],
  [XP.milestone, 'Reach a milestone'],
  [XP.goal, 'Complete a goal'],
];

export default function Achievements() {
  const state = useAppState();
  const stats = computeStats(state);
  const unlocked = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;
  const rankIndex = RANKS.findIndex((r) => r.name === stats.rank.name);

  return (
    <div className="achievements">
      <header className="page-head">
        <div>
          <h1>Achievements</h1>
          <p>
            {unlocked} of {ACHIEVEMENTS.length} unlocked. Everything you do earns XP, and XP moves you up the ranks.
          </p>
        </div>
      </header>

      <section className="rank-hero">
        <div className="rank-now">
          <span className="rank-level num">{stats.level}</span>
          <div>
            <h2 className="display">{stats.rank.name}</h2>
            <p className="muted">{stats.rank.line}</p>
            <div className="rank-xp">
              <Bar value={stats.pct} />
              <span className="faint">
                {stats.xp.toLocaleString()} XP. {(stats.ceil - stats.xp).toLocaleString()} more to level {stats.level + 1}
                {stats.next ? `, ${stats.next.name} at level ${stats.next.level}.` : '.'}
              </span>
            </div>
          </div>
        </div>
        <ol className="rank-ladder" aria-label="Ranks">
          <span className="ladder-track" aria-hidden="true">
            <motion.i initial={{ width: 0 }} animate={{ width: `${(rankIndex / (RANKS.length - 1)) * 100}%` }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
          </span>
          {RANKS.map((r, i) => (
            <li key={r.name} className={i < rankIndex ? 'passed' : i === rankIndex ? 'current' : ''} style={{ '--size': `${10 + i * 2}px` }}>
              <span className="planet" data-tip={`Level ${r.level}`} />
              <span className="rank-name">{r.name}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="ach-layout">
        <section className="badge-grid">
          {ACHIEVEMENTS.map((a, i) => {
            const Icon = a.icon;
            const at = state.achievements[a.id];
            return (
              <motion.div
                key={a.id}
                className={`badge${at ? ' unlocked' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.35 }}
              >
                <span className="badge-orb">{at ? <Icon /> : <Lock />}</span>
                <strong>{a.title}</strong>
                <span className="muted">{a.desc}</span>
                {at && <span className="faint">Unlocked {formatShort(ymd(new Date(at)))}</span>}
              </motion.div>
            );
          })}
        </section>

        <aside className="panel xp-rules">
          <div className="panel-head">
            <h3>How XP works</h3>
          </div>
          <ul>
            {XP_RULES.map(([v, l]) => (
              <li key={l}>
                <span>{l}</span>
                <span className="num">+{v}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
