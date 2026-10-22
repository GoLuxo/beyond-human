import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Flame, Bell, Pencil, Archive, RotateCcw, Repeat, ChevronDown, Check } from 'lucide-react';
import { useAppState } from '../state/store.js';
import { toggleHabit, updateHabit } from '../state/actions.js';
import { useApp } from '../AppContext.js';
import { Empty } from '../components/ui.jsx';
import { habitIcon } from '../lib/icons.js';
import { habitScheduled, habitStreak, habitBestStreak, habitRate, computeStats } from '../lib/progress.js';
import { todayKey, weekDays, formatWeekday, parseYmd, formatTime, addDays, weekdayLabels, formatLong, ymd } from '../lib/dates.js';
import { completed, play } from '../lib/feedback.js';
import { toast } from '../lib/events.js';

function scheduleText(days, weekStart) {
  if (!days?.length || days.length === 7) return 'Every day';
  if ([...days].sort().join() === '1,2,3,4,5') return 'Weekdays';
  return weekdayLabels(weekStart)
    .filter((d) => days.includes(d.day))
    .map((d) => d.short)
    .join(', ');
}

function Heatmap({ habit, weekStart }) {
  const today = todayKey();
  const weeks = 22;
  const firstWeek = weekDays(addDays(today, -7 * (weeks - 1)), weekStart)[0];
  const created = habit.createdAt ? ymd(new Date(habit.createdAt)) : today;
  return (
    <div className="heatmap" role="img" aria-label={`Last ${weeks} weeks of ${habit.name}`}>
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} className="heat-col">
          {Array.from({ length: 7 }, (_, d) => {
            const key = addDays(firstWeek, w * 7 + d);
            const cls = key > today ? 'future' : habit.log?.[key] ? 'on' : !habitScheduled(habit, key) || key < created ? 'off' : 'miss';
            return <i key={d} className={`heat ${cls}`} title={formatLong(key)} />;
          })}
        </div>
      ))}
    </div>
  );
}

function HabitRow({ habit, week, today, weekStart, onEdit }) {
  const [open, setOpen] = useState(false);
  const Icon = habitIcon(habit.icon);
  const streak = habitStreak(habit, today);
  const rate = habitRate(habit, 30, today);
  const created = habit.createdAt ? ymd(new Date(habit.createdAt)) : today;

  return (
    <motion.li layout className={`habit-row${open ? ' open' : ''}`}>
      <div className="habit-line">
        <button className="habit-name" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className={`orb sm${habit.log?.[today] ? ' done' : ''}`}>
            <Icon />
          </span>
          <span>
            <strong>{habit.name}</strong>
            <span className="habit-sub">
              {scheduleText(habit.days, weekStart)}
              {habit.reminder && (
                <>
                  {' '}
                  <Bell size={11} /> {formatTime(habit.reminder)}
                </>
              )}
            </span>
          </span>
          <ChevronDown className="habit-chevron" />
        </button>
        {week.map((key) => {
          const scheduled = habitScheduled(habit, key);
          const done = Boolean(habit.log?.[key]);
          const future = key > today;
          if (!scheduled) return <span key={key} className="habit-cell rest" aria-label="Rest day" />;
          return (
            <button
              key={key}
              className={`habit-cell${done ? ' done' : ''}${key === today ? ' today' : ''}`}
              disabled={future}
              aria-pressed={done}
              aria-label={`${habit.name}, ${formatLong(key)}`}
              onClick={(e) => {
                if (toggleHabit(habit.id, key)) completed(e, 0.6);
                else play('uncheck');
              }}
            >
              {done && <Check />}
            </button>
          );
        })}
        <span className="habit-streak">
          <Flame /> <span className="num">{streak}</span>
        </span>
        <span className="habit-rate num">{rateLabel(rate, created, today)}</span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="habit-detail" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
            <div className="habit-detail-inner">
              <Heatmap habit={habit} weekStart={weekStart} />
              <div className="habit-facts">
                <div>
                  <span className="num">{streak}</span>
                  <span className="muted">current streak</span>
                </div>
                <div>
                  <span className="num">{habitBestStreak(habit)}</span>
                  <span className="muted">best streak</span>
                </div>
                <div>
                  <span className="num">{Object.values(habit.log ?? {}).filter(Boolean).length}</span>
                  <span className="muted">times done</span>
                </div>
              </div>
              <div className="row">
                <button className="btn btn-sm" onClick={() => onEdit(habit)}>
                  <Pencil /> Edit
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    updateHabit(habit.id, { archived: true });
                    toast(`Archived ${habit.name}`, { action: { label: 'Undo', onClick: () => updateHabit(habit.id, { archived: false }) } });
                  }}
                >
                  <Archive /> Archive
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

const rateLabel = (rate, created, today) => (created === today && rate === 0 ? 'New' : `${Math.round(rate * 100)}%`);

export default function Habits() {
  const state = useAppState();
  const { openHabit } = useApp();
  const stats = computeStats(state);
  const [showArchived, setShowArchived] = useState(false);
  const today = todayKey();
  const { weekStart } = state.settings;
  const week = weekDays(today, weekStart);
  const active = state.habits.filter((h) => !h.archived);
  const archived = state.habits.filter((h) => h.archived);
  const dueToday = active.filter((h) => habitScheduled(h, today));
  const doneToday = dueToday.filter((h) => h.log?.[today]).length;

  return (
    <div className="habits">
      <header className="page-head">
        <div>
          <h1>Habits</h1>
          <p>
            {dueToday.length ? `${doneToday} of ${dueToday.length} done today. ` : ''}
            {stats.habitChecks} check-ins so far. Your longest chain is {stats.bestHabitStreak} days.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => openHabit()}>
            <Plus /> New habit
          </button>
        </div>
      </header>

      {active.length ? (
        <section className="panel habit-table">
          <div className="habit-line habit-head">
            <span>This week</span>
            {week.map((k) => (
              <span key={k} className={k === today ? 'today' : ''}>
                <span>{formatWeekday(k)}</span>
                <strong className="num">{parseYmd(k).getDate()}</strong>
              </span>
            ))}
            <span>Streak</span>
            <span>30 days</span>
          </div>
          <ul>
            {active.map((h) => (
              <HabitRow key={h.id} habit={h} week={week} today={today} weekStart={weekStart} onEdit={openHabit} />
            ))}
          </ul>
        </section>
      ) : (
        <section className="panel">
          <Empty icon={Repeat} title="Build your first habit" action={<button className="btn btn-primary" onClick={() => openHabit()}><Plus /> New habit</button>}>
            Pick something small enough to do on your worst day. Consistency beats intensity.
          </Empty>
        </section>
      )}

      {archived.length > 0 && (
        <div className="archived">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowArchived(!showArchived)}>
            <Archive /> {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
          {showArchived && (
            <ul className="archived-list">
              {archived.map((h) => {
                const Icon = habitIcon(h.icon);
                return (
                  <li key={h.id}>
                    <Icon />
                    <span>{h.name}</span>
                    <button className="btn btn-sm" onClick={() => updateHabit(h.id, { archived: false })}>
                      <RotateCcw /> Restore
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
