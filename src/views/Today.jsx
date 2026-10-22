import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Share2, Check, Flame, Shuffle, Timer, ArrowUpRight, Repeat, ListChecks, Sparkles, Target } from 'lucide-react';
import { useAppState } from '../state/store.js';
import { addTask, toggleHabit, moveUnfinished } from '../state/actions.js';
import { useApp } from '../AppContext.js';
import YearOrbit3D from '../components/YearOrbit3D.jsx';
import MonthsGrid from '../components/MonthsGrid.jsx';
import { SplitHeading, CountUp } from '../components/motion.jsx';
import TaskRow, { sortTasks } from '../components/TaskRow.jsx';
import DayDrawer from '../components/DayDrawer.jsx';
import { Empty, Bar } from '../components/ui.jsx';
import { computeStats, scorer, habitScheduled, habitStreak, goalProgress } from '../lib/progress.js';
import { ymd, todayKey, addDays, dayOfYear, daysInYear, formatLong, formatFull, greeting, parseYmd } from '../lib/dates.js';
import { dailyQuote, randomQuote } from '../lib/quotes.js';
import { habitIcon } from '../lib/icons.js';
import { toggleLit } from '../lib/rituals.js';
import { completed, play } from '../lib/feedback.js';
import { toast, celebrate } from '../lib/events.js';

let introPlayed = false;

export default function Today() {
  const state = useAppState();
  const { openTask, openHabit, navigate, openShare } = useApp();
  const stats = computeStats(state);
  const today = todayKey();
  const now = new Date();
  const year = now.getFullYear();
  const lit = Boolean(state.days[today]?.done);

  const [hover, setHover] = useState(null);
  const [drawerDay, setDrawerDay] = useState(null);
  const [quote, setQuote] = useState(() => dailyQuote(now));
  const [draft, setDraft] = useState('');
  const [animateOrbit] = useState(() => {
    const first = !introPlayed;
    introPlayed = true;
    return first;
  });

  const scoreOf = scorer(state);
  const dayCounted = useRef(false);
  useEffect(() => {
    dayCounted.current = true;
  }, []);
  const joined = ymd(new Date(state.profile.createdAt));
  const goalsById = useMemo(() => Object.fromEntries(state.goals.map((g) => [g.id, g])), [state.goals]);
  const tasks = sortTasks(state.tasks.filter((t) => t.date === today));
  const doneCount = tasks.filter((t) => t.done).length;
  const yesterday = addDays(today, -1);
  const leftovers = state.tasks.filter((t) => t.date === yesterday && !t.done).length;
  const habits = state.habits.filter((h) => !h.archived && habitScheduled(h, today));
  const focusToday = state.focus.filter((f) => f.date === today).reduce((n, f) => n + f.minutes, 0);
  const northStar = state.goals.find((g) => g.northStar && !g.completedAt) ?? state.goals.find((g) => !g.completedAt);

  const quickAdd = () => {
    if (!draft.trim()) return;
    addTask({ title: draft, date: today });
    play('tick');
    setDraft('');
  };

  const hoverInfo = hover && {
    date: formatLong(hover),
    status: hover > today ? 'Upcoming' : state.days[hover]?.done ? 'Lit' : hover === today ? 'Not lit yet' : 'Not lit',
    score: hover > today ? null : Math.round(scoreOf(hover) * 100),
  };

  return (
    <div className="today">
      <header className="page-head">
        <div>
          <SplitHeading text={`${greeting(now)}, ${state.profile.name || 'friend'}.`} />
          <p>
            {formatFull(today)}. {daysInYear(year) - dayOfYear(now)} days left this year.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={openShare}>
            <Share2 /> Share
          </button>
          <button className="btn" onClick={() => navigate('focus')}>
            <Timer /> Focus
          </button>
          <button className="btn btn-primary" onClick={() => openTask()}>
            <Plus /> Add task
          </button>
        </div>
      </header>

      <section className="hero" aria-label="Your year">
        <div className="hero-orbit">
          <YearOrbit3D
            year={year}
            today={today}
            startKey={joined}
            days={state.days}
            scoreOf={scoreOf}
            hoverKey={hover}
            onHover={setHover}
            onSelect={setDrawerDay}
            intro={animateOrbit}
            reduced={state.settings.reduceMotion}
          >
            <AnimatePresence mode="wait" initial={false}>
              {hoverInfo ? (
                <motion.div key="hover" className="orbit-readout" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>
                  <span className="orbit-day num">{dayOfYear(parseYmd(hover))}</span>
                  <span className="orbit-date">{hoverInfo.date}</span>
                  <span className="muted">
                    {hoverInfo.status}
                    {hoverInfo.score !== null && hoverInfo.score > 0 ? `, ${hoverInfo.score}% done` : ''}
                  </span>
                </motion.div>
              ) : (
                <motion.div key="today" className="orbit-readout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>
                  <CountUp className={`orbit-day num${lit ? ' lit' : ''}`} value={dayOfYear(now)} fromZero={!dayCounted.current} duration={animateOrbit ? 3 : 1.2} delay={animateOrbit ? 0.6 : 0} />
                  <span className="orbit-date">of {daysInYear(year)} days</span>
                  <button
                    className={`light-btn${lit ? ' on' : ''}`}
                    onClick={(e) => {
                      if (!lit) toggleLit(today, e);
                      else {
                        play('lightUp');
                        celebrate(e, 1.2);
                      }
                    }}
                    data-tip={lit ? 'Undo from the day panel: click today on the ring' : undefined}
                  >
                    {lit ? <Check /> : <Sparkles />}
                    {lit ? 'Today is lit' : 'Light up today'}
                  </button>
                  <span className="orbit-streak">
                    <Flame /> {stats.streak > 0 ? `${stats.streak}-day streak` : 'Start a streak today'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </YearOrbit3D>
        </div>

        <div className="hero-year">
          <div className="hero-stats">
            <div>
              <CountUp className="num" value={stats.litDays} delay={0.3} />
              <span className="muted">days lit</span>
            </div>
            <div>
              <CountUp className="num" value={stats.streak} delay={0.4} />
              <span className="muted">day streak</span>
            </div>
            <div>
              <CountUp className="num" value={stats.bestStreak} delay={0.5} />
              <span className="muted">best streak</span>
            </div>
            <div>
              <CountUp className="num" value={daysInYear(year) - dayOfYear(now)} delay={0.6} />
              <span className="muted">days left</span>
            </div>
          </div>
          <MonthsGrid compact year={year} days={state.days} scoreOf={scoreOf} today={today} joined={joined} hoverKey={hover} onHover={setHover} onSelect={setDrawerDay} animate={animateOrbit} />
          <p className="hero-hint faint">Hover a day here or on the ring and both light up together. Click any day to open it.</p>
        </div>
      </section>

      <div className="today-cols">
        <section className="panel">
          <div className="panel-head">
            <h3>Today's plan</h3>
            <span className="muted">{tasks.length ? `${doneCount} of ${tasks.length} done` : 'Nothing planned yet'}</span>
          </div>
          {tasks.length > 0 && <Bar value={doneCount / tasks.length} />}
          {leftovers > 0 && (
            <div className="carry">
              <span>
                {leftovers} unfinished {leftovers === 1 ? 'task' : 'tasks'} from yesterday
              </span>
              <button
                className="btn btn-sm"
                onClick={() => {
                  const n = moveUnfinished(yesterday, today);
                  toast(`Moved ${n} ${n === 1 ? 'task' : 'tasks'} to today`);
                }}
              >
                Move to today
              </button>
            </div>
          )}
          {tasks.length ? (
            <ul className="task-list">
              <AnimatePresence initial={false}>
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} goal={goalsById[t.goalId]} onEdit={(task) => openTask({ task })} />
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <Empty icon={ListChecks} title="A blank page">
              Add the three things that would make today a win.
            </Empty>
          )}
          <div className="quick-add">
            <Plus />
            <input className="input-bare" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && quickAdd()} placeholder="Add a task and press Enter" aria-label="Quick add task" />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Habits</h3>
            <span className="muted">{habits.length ? `${habits.filter((h) => h.log?.[today]).length} of ${habits.length} done` : ''}</span>
          </div>
          {habits.length ? (
            <ul className="habit-orbs">
              {habits.map((h) => {
                const Icon = habitIcon(h.icon);
                const done = Boolean(h.log?.[today]);
                const streak = habitStreak(h, today);
                return (
                  <li key={h.id}>
                    <button
                      className={`habit-orb${done ? ' done' : ''}`}
                      aria-pressed={done}
                      onClick={(e) => {
                        if (toggleHabit(h.id, today)) completed(e, 0.7);
                        else play('uncheck');
                      }}
                    >
                      <span className="orb">
                        <Icon />
                      </span>
                      <span className="habit-orb-name">{h.name}</span>
                      <span className="habit-orb-streak">{streak > 0 ? `${streak} day${streak === 1 ? '' : 's'}` : 'Day one'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty icon={Repeat} title="No habits yet" action={<button className="btn btn-sm" onClick={() => openHabit()}><Plus /> Create a habit</button>}>
              Habits are the small, repeatable actions that add up to your goals.
            </Empty>
          )}
        </section>
      </div>

      <section className="quote-band">
        <AnimatePresence mode="wait">
          <motion.blockquote key={quote.text} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
            <p className="display">{quote.text}</p>
            <cite>{quote.author}</cite>
          </motion.blockquote>
        </AnimatePresence>
        <button className="icon-btn" onClick={() => setQuote((q) => randomQuote(q))} data-tip="Another quote" aria-label="Show another quote">
          <Shuffle />
        </button>
      </section>

      <section className="vitals" aria-label="Your progress">
        <button className="vital" onClick={() => navigate('year')}>
          <span className="vital-label">
            <Flame /> Streak
          </span>
          <span className="vital-value num">{stats.streak}</span>
          <span className="faint">Best: {stats.bestStreak} days</span>
        </button>
        <button className="vital" onClick={() => navigate('achievements')}>
          <span className="vital-label">
            <Sparkles /> Level {stats.level}, {stats.rank.name}
          </span>
          <span className="vital-value num">{stats.xp.toLocaleString()}</span>
          <Bar value={stats.pct} />
          <span className="faint">{(stats.ceil - stats.xp).toLocaleString()} XP to level {stats.level + 1}</span>
        </button>
        <button className="vital" onClick={() => navigate('focus')}>
          <span className="vital-label">
            <Timer /> Focus today
          </span>
          <span className="vital-value num">{focusToday}</span>
          <span className="faint">minutes of deep work</span>
        </button>
        <button className="vital" onClick={() => navigate('goals')}>
          <span className="vital-label">
            <Target /> North Star
          </span>
          {northStar ? (
            <>
              <span className="vital-goal">{northStar.title}</span>
              <Bar value={goalProgress(northStar)} />
              <span className="faint">{Math.round(goalProgress(northStar) * 100)}% there</span>
            </>
          ) : (
            <span className="faint">
              Set a goal <ArrowUpRight size={12} />
            </span>
          )}
        </button>
      </section>

      <DayDrawer dayKey={drawerDay} onClose={() => setDrawerDay(null)} />
    </div>
  );
}
