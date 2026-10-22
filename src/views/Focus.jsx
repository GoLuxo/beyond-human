import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, SkipForward, Maximize2, Minimize2, VolumeX, Waves, CloudRain, Timer } from 'lucide-react';
import { useAppState } from '../state/store.js';
import { updateSettings } from '../state/actions.js';
import { useFocusTimer, timer } from '../lib/focusTimer.js';
import { Segmented, Field, Empty } from '../components/ui.jsx';
import { formatClock } from '../components/TitleBar.jsx';
import { todayKey, lastNDays, formatWeekday } from '../lib/dates.js';

const SIZE = 440;
const C = SIZE / 2;
const R = 190;

function TimerRing({ fraction, running, mode }) {
  const circ = 2 * Math.PI * R;
  const angle = -90 + 360 * (1 - fraction);
  const dot = [C + R * Math.cos((angle * Math.PI) / 180), C + R * Math.sin((angle * Math.PI) / 180)];
  return (
    <svg className={`timer-ring${running ? ' running' : ''}`} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      <defs>
        <filter id="timer-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i * 6 - 90) * (Math.PI / 180);
        const long = i % 5 === 0;
        const r1 = R + 18;
        const r2 = R + (long ? 30 : 24);
        return <line key={i} x1={C + r1 * Math.cos(a)} y1={C + r1 * Math.sin(a)} x2={C + r2 * Math.cos(a)} y2={C + r2 * Math.sin(a)} className={long ? 'tick-major' : 'tick-minor'} />;
      })}
      <circle cx={C} cy={C} r={R} className="timer-track" />
      <circle
        cx={C}
        cy={C}
        r={R}
        className={`timer-arc ${mode}`}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - fraction)}
        transform={`rotate(-90 ${C} ${C}) scale(1 -1) translate(0 ${-SIZE})`}
        filter="url(#timer-glow)"
      />
      <circle cx={dot[0]} cy={dot[1]} r="7" className="timer-dot" filter="url(#timer-glow)" />
    </svg>
  );
}

export default function Focus() {
  const state = useAppState();
  const t = useFocusTimer();
  const [zen, setZen] = useState(false);
  const today = todayKey();
  const { settings } = state;
  const tasks = state.tasks.filter((x) => x.date === today && !x.done);
  const sessionsToday = state.focus.filter((f) => f.date === today);
  const minutesToday = sessionsToday.reduce((n, f) => n + f.minutes, 0);
  const week = lastNDays(7).map((k) => ({ k, m: state.focus.filter((f) => f.date === k).reduce((n, f) => n + f.minutes, 0) }));
  const maxWeek = Math.max(30, ...week.map((w) => w.m));
  const fraction = t.duration ? t.remaining / t.duration : 1;
  const running = t.status === 'running';
  const perCycle = settings.sessionsBeforeLong || 4;
  const task = state.tasks.find((x) => x.id === t.taskId);

  useEffect(() => {
    document.documentElement.dataset.zen = zen ? 'on' : 'off';
    return () => {
      document.documentElement.dataset.zen = 'off';
    };
  }, [zen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || /input|textarea|select|button/i.test(e.target.tagName)) return;
      e.preventDefault();
      if (running) timer.pause();
      else timer.start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running]);

  const label = t.mode === 'focus' ? 'Deep focus' : t.mode === 'short' ? 'Short break' : 'Long break';

  return (
    <div className={`focus${zen ? ' zen' : ''}`}>
      {!zen && (
        <header className="page-head">
          <div>
            <h1>Focus</h1>
            <p>One task. No tabs. {settings.focusMinutes} minutes at a time. Press Space to start or pause.</p>
          </div>
          <div className="page-actions">
            <button className="btn" onClick={() => setZen(true)}>
              <Maximize2 /> Zen mode
            </button>
          </div>
        </header>
      )}

      <div className="focus-grid">
        <section className="focus-stage">
          <Segmented
            label="Timer mode"
            value={t.mode}
            onChange={(m) => timer.setMode(m)}
            options={[
              { value: 'focus', label: 'Focus' },
              { value: 'short', label: 'Short break' },
              { value: 'long', label: 'Long break' },
            ]}
          />
          <div className="timer-wrap">
            <TimerRing fraction={fraction} running={running} mode={t.mode} />
            <div className="timer-center">
              <span className="muted">{label}</span>
              <motion.span className="timer-clock num" key={t.mode} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                {formatClock(t.remaining)}
              </motion.span>
              <span className="timer-task">{task ? task.title : t.mode === 'focus' ? 'Free focus' : 'Breathe. Stretch. Water.'}</span>
            </div>
          </div>
          <div className="timer-controls">
            <button className="icon-btn lg" onClick={timer.reset} aria-label="Reset" data-tip="Reset">
              <RotateCcw />
            </button>
            <button className={`play-btn${running ? ' running' : ''}`} onClick={running ? timer.pause : timer.start} aria-label={running ? 'Pause' : 'Start'}>
              {running ? <Pause /> : <Play />}
            </button>
            <button className="icon-btn lg" onClick={timer.skip} aria-label="Skip" data-tip={t.mode === 'focus' ? 'Finish early' : 'Skip break'}>
              <SkipForward />
            </button>
          </div>
          <div className="cycle-dots" aria-label={`${t.cycle % perCycle} of ${perCycle} sessions before a long break`}>
            {Array.from({ length: perCycle }, (_, i) => (
              <i key={i} className={i < t.cycle % perCycle ? 'on' : ''} />
            ))}
          </div>
          {zen && (
            <button className="btn btn-ghost zen-exit" onClick={() => setZen(false)}>
              <Minimize2 /> Leave zen mode
            </button>
          )}
        </section>

        {!zen && (
          <aside className="focus-side">
            <section className="panel">
              <div className="panel-head">
                <h3>Working on</h3>
              </div>
              <select className="select" value={t.taskId ?? ''} onChange={(e) => timer.setTask(e.target.value || null)} aria-label="Task to focus on">
                <option value="">Free focus</option>
                {tasks.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </select>
              <div className="panel-head" style={{ marginTop: 20 }}>
                <h3>Background sound</h3>
              </div>
              <Segmented
                label="Background sound"
                value={t.ambient}
                onChange={timer.setAmbient}
                options={[
                  { value: 'off', label: 'Off', icon: VolumeX },
                  { value: 'brown', label: 'Deep', icon: Waves },
                  { value: 'rain', label: 'Rain', icon: CloudRain },
                ]}
              />
              {t.ambient !== 'off' && <input className="volume" type="range" min="0" max="1" step="0.05" value={t.volume} onChange={(e) => timer.setVolume(Number(e.target.value))} aria-label="Volume" />}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h3>Today</h3>
                <span className="muted">
                  {sessionsToday.length} {sessionsToday.length === 1 ? 'session' : 'sessions'}
                </span>
              </div>
              <div className="focus-total">
                <span className="num">{minutesToday}</span>
                <span className="muted">minutes focused</span>
              </div>
              <div className="mini-bars" aria-label="Focus minutes over the last 7 days">
                {week.map((w) => (
                  <div key={w.k} className={w.k === today ? 'today' : ''}>
                    <i style={{ height: `${(w.m / maxWeek) * 100}%` }} title={`${w.m} min`} />
                    <span>{formatWeekday(w.k)}</span>
                  </div>
                ))}
              </div>
              {sessionsToday.length === 0 && (
                <Empty icon={Timer} title="No sessions yet">
                  Your first session today is worth the most.
                </Empty>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h3>Timer lengths</h3>
              </div>
              <div className="grid-3">
                <Field label="Focus">
                  <input className="input" type="number" min="5" max="180" value={settings.focusMinutes} onChange={(e) => updateSettings({ focusMinutes: Math.max(1, Number(e.target.value) || 25) })} />
                </Field>
                <Field label="Short">
                  <input className="input" type="number" min="1" max="60" value={settings.shortBreak} onChange={(e) => updateSettings({ shortBreak: Math.max(1, Number(e.target.value) || 5) })} />
                </Field>
                <Field label="Long">
                  <input className="input" type="number" min="1" max="90" value={settings.longBreak} onChange={(e) => updateSettings({ longBreak: Math.max(1, Number(e.target.value) || 15) })} />
                </Field>
              </div>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}
