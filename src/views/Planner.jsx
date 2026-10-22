import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, MoveRight, CalendarDays, Check } from 'lucide-react';
import { useAppState } from '../state/store.js';
import { addTask, moveUnfinished, toggleTask } from '../state/actions.js';
import { useApp, takePendingDate } from '../AppContext.js';
import TaskRow, { sortTasks } from '../components/TaskRow.jsx';
import { Empty, ProgressRing } from '../components/ui.jsx';
import { todayKey, addDays, weekDays, formatLong, relativeDays, formatWeekday, parseYmd, toMinutes, fromMinutes, formatHour, formatTime } from '../lib/dates.js';
import { scorer } from '../lib/progress.js';
import { completed, play } from '../lib/feedback.js';
import { toast } from '../lib/events.js';

const HOUR = 64;

function layoutBlocks(tasks) {
  const items = tasks
    .map((t) => ({ t, start: toMinutes(t.time), end: toMinutes(t.time) + (t.duration || 30) }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = [];
    for (const it of cluster) {
      let c = cols.findIndex((end) => end <= it.start);
      if (c === -1) {
        c = cols.length;
        cols.push(it.end);
      } else cols[c] = it.end;
      it.col = c;
    }
    for (const it of cluster) out.push({ ...it, cols: cols.length });
    cluster = [];
  };
  for (const it of items) {
    if (cluster.length && it.start >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return out;
}

export default function Planner() {
  const state = useAppState();
  const { openTask } = useApp();
  const { dayStart, dayEnd, weekStart } = state.settings;
  const [date, setDate] = useState(() => takePendingDate() ?? todayKey());
  const [draft, setDraft] = useState('');
  const [nowMin, setNowMin] = useState(() => new Date().getHours() * 60 + new Date().getMinutes());
  const scrollRef = useRef(null);
  const today = todayKey();
  const scoreOf = scorer(state);

  useEffect(() => {
    const id = setInterval(() => setNowMin(new Date().getHours() * 60 + new Date().getMinutes()), 30000);
    return () => clearInterval(id);
  }, []);

  const dayTasks = state.tasks.filter((t) => t.date === date);
  const scheduled = dayTasks.filter((t) => t.time);
  const anytime = sortTasks(dayTasks.filter((t) => !t.time));
  const blocks = layoutBlocks(scheduled);
  const goalsById = useMemo(() => Object.fromEntries(state.goals.map((g) => [g.id, g])), [state.goals]);
  const hours = Array.from({ length: Math.max(1, dayEnd - dayStart + 1) }, (_, i) => dayStart + i);
  const startMin = dayStart * 60;
  const endMin = (dayEnd + 1) * 60;
  const unfinished = dayTasks.filter((t) => !t.done).length;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const first = date === today ? nowMin - 60 : Math.min(...scheduled.map((t) => toMinutes(t.time)), 8 * 60);
    el.scrollTo({ top: Math.max(0, ((first - startMin) / 60) * HOUR - 20), behavior: 'smooth' });
  }, [date]);

  const quickAdd = () => {
    if (!draft.trim()) return;
    addTask({ title: draft, date });
    play('tick');
    setDraft('');
  };

  const clickTimeline = (e) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = startMin + Math.floor((y / HOUR) * 2) * 30;
    openTask({ defaults: { date, time: fromMinutes(Math.min(minutes, 23 * 60 + 30)) } });
  };

  return (
    <div className="planner">
      <header className="page-head">
        <div>
          <h1>{formatLong(date)}</h1>
          <p>
            {relativeDays(date)}. {dayTasks.length ? `${dayTasks.filter((t) => t.done).length} of ${dayTasks.length} tasks done.` : 'Nothing planned yet.'}
          </p>
        </div>
        <div className="page-actions">
          <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
            <ChevronLeft />
          </button>
          <button className="btn btn-sm" onClick={() => setDate(today)} disabled={date === today}>
            Today
          </button>
          <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
            <ChevronRight />
          </button>
          <input className="input date-jump" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Jump to date" />
          <button className="btn btn-primary" onClick={() => openTask({ defaults: { date } })}>
            <Plus /> Add task
          </button>
        </div>
      </header>

      <div className="week-strip">
        {weekDays(date, weekStart).map((k) => {
          const count = state.tasks.filter((t) => t.date === k).length;
          return (
            <button key={k} className={`week-day${k === date ? ' active' : ''}${k === today ? ' today' : ''}`} onClick={() => setDate(k)}>
              {k === date && <motion.span className="week-pill" layoutId="week-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="wd-name">{formatWeekday(k)}</span>
              <ProgressRing value={k > today ? 0 : scoreOf(k)} size={42} stroke={2} glow={false}>
                <span className="wd-num num">{parseYmd(k).getDate()}</span>
              </ProgressRing>
              <span className="wd-count">{count ? `${count} ${count === 1 ? 'task' : 'tasks'}` : ' '}</span>
              {state.days[k]?.done && <i className="wd-lit" aria-label="Lit" />}
            </button>
          );
        })}
      </div>

      <div className="planner-grid">
        <section className="panel timeline-panel" aria-label="Timeline">
          <div className="timeline-scroll" ref={scrollRef}>
            <div className="timeline" style={{ height: hours.length * HOUR }}>
              {hours.map((h, i) => (
                <div key={h} className="hour" style={{ top: i * HOUR }}>
                  <span>{formatHour(h % 24)}</span>
                </div>
              ))}
              <div className="timeline-track" onClick={clickTimeline} title="Click to add a task at this time">
                {blocks.map(({ t, start, end, col, cols }) => {
                  const top = ((Math.max(start, startMin) - startMin) / 60) * HOUR;
                  const height = Math.max(26, ((Math.min(end, endMin) - Math.max(start, startMin)) / 60) * HOUR - 4);
                  if (end <= startMin || start >= endMin) return null;
                  return (
                    <motion.div
                      key={t.id}
                      layout
                      className={`block${t.done ? ' done' : ''}${t.priority === 1 ? ' high' : ''}`}
                      style={{ top, height, left: `calc(${(col / cols) * 100}% + 4px)`, width: `calc(${100 / cols}% - 8px)` }}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => openTask({ task: t })}
                    >
                      <button
                        className="block-check"
                        aria-label={t.done ? 'Mark as not done' : 'Complete'}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (toggleTask(t.id)) completed(e, 0.7);
                          else play('uncheck');
                        }}
                      >
                        {t.done && <Check />}
                      </button>
                      <div className="block-text">
                        <strong>{t.title}</strong>
                        {height > 50 && (
                          <span>
                            {formatTime(t.time)} to {formatTime(fromMinutes(end))}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {date === today && nowMin >= startMin && nowMin < endMin && (
                  <div className="now-line" style={{ top: ((nowMin - startMin) / 60) * HOUR }}>
                    <i />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="planner-side">
          <section className="panel">
            <div className="panel-head">
              <h3>Anytime</h3>
              <span className="muted">No set time</span>
            </div>
            {anytime.length ? (
              <ul className="task-list">
                <AnimatePresence initial={false}>
                  {anytime.map((t) => (
                    <TaskRow key={t.id} task={t} goal={goalsById[t.goalId]} onEdit={(task) => openTask({ task })} />
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <Empty icon={CalendarDays} title="Nothing floating">
                Tasks without a time land here. Click the timeline to schedule one.
              </Empty>
            )}
            <div className="quick-add">
              <Plus />
              <input className="input-bare" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && quickAdd()} placeholder="Add a task and press Enter" aria-label="Quick add task" />
            </div>
          </section>

          {unfinished > 0 && date <= today && (
            <button
              className="btn carry-btn"
              onClick={() => {
                const n = moveUnfinished(date, addDays(date, 1));
                toast(`Moved ${n} ${n === 1 ? 'task' : 'tasks'} to ${relativeDays(addDays(date, 1)).toLowerCase()}`);
              }}
            >
              <MoveRight /> Move {unfinished} unfinished to the next day
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
