import { useState } from 'react';
import { useAppState } from '../state/store.js';
import { computeStats, scorer, habitRate } from '../lib/progress.js';
import { lastNDays, formatShort, formatWeekday, todayKey, parseYmd, weekdayLabels } from '../lib/dates.js';
import { BarChart, LineChart } from '../components/charts.jsx';
import { Bar, Segmented, Empty } from '../components/ui.jsx';
import { habitIcon } from '../lib/icons.js';
import { MOODS } from '../components/DayDrawer.jsx';
import { ChartColumn } from 'lucide-react';

export default function Insights() {
  const state = useAppState();
  const stats = computeStats(state);
  const scoreOf = scorer(state);
  const [range, setRange] = useState(30);
  const today = todayKey();
  const days = lastNDays(range);

  const brightness = days.map((k) => ({ label: formatShort(k), full: `${formatWeekday(k)}, ${formatShort(k)}`, value: Math.round(scoreOf(k) * 100) }));
  const focusByDay = new Map();
  for (const f of state.focus) focusByDay.set(f.date, (focusByDay.get(f.date) ?? 0) + f.minutes);
  const focus = lastNDays(14).map((k) => ({ key: k, label: formatWeekday(k).slice(0, 2), full: formatShort(k), value: focusByDay.get(k) ?? 0, highlight: k === today }));
  const mood = days.map((k) => ({ label: formatShort(k), full: formatShort(k), value: state.days[k]?.mood ?? null }));
  const moodLogged = mood.filter((m) => m.value != null);

  const weekdaySums = Array.from({ length: 7 }, () => ({ total: 0, n: 0 }));
  for (const k of lastNDays(84)) {
    const d = parseYmd(k).getDay();
    weekdaySums[d].total += scoreOf(k);
    weekdaySums[d].n += 1;
  }
  const weekdays = weekdayLabels(state.settings.weekStart).map(({ day, short }) => ({
    key: day,
    label: short,
    full: `${short}, average over 12 weeks`,
    value: Math.round((weekdaySums[day].total / Math.max(1, weekdaySums[day].n)) * 100),
  }));
  const bestDay = [...weekdays].sort((a, b) => b.value - a.value)[0];

  const habits = state.habits
    .filter((h) => !h.archived)
    .map((h) => ({ h, rate: habitRate(h, 30, today) }))
    .sort((a, b) => b.rate - a.rate);

  const avgBrightness = Math.round(brightness.reduce((n, b) => n + b.value, 0) / brightness.length);
  const moodLabel = (v) => MOODS.find((m) => m.value === Math.round(v))?.label ?? '';

  return (
    <div className="insights">
      <header className="page-head">
        <div>
          <h1>Insights</h1>
          <p>The patterns behind your progress. Brightness is the share of a day's tasks and habits you finished.</p>
        </div>
        <div className="page-actions">
          <Segmented
            label="Range"
            value={range}
            onChange={setRange}
            options={[
              { value: 14, label: '14 days' },
              { value: 30, label: '30 days' },
              { value: 90, label: '90 days' },
            ]}
          />
        </div>
      </header>

      <section className="totals">
        {[
          [stats.tasksDone, 'tasks completed'],
          [stats.habitChecks, 'habit check-ins'],
          [(stats.focusMinutes / 60).toFixed(stats.focusMinutes < 600 ? 1 : 0), 'hours of focus'],
          [stats.litDays, 'days lit'],
          [stats.journalCount, 'journal entries'],
          [stats.goalsDone, 'goals reached'],
        ].map(([v, l]) => (
          <div key={l}>
            <span className="num">{v}</span>
            <span className="muted">{l}</span>
          </div>
        ))}
      </section>

      <div className="insight-grid">
        <section className="panel span-2">
          <div className="panel-head">
            <h3>Daily brightness</h3>
            <span className="muted">{avgBrightness}% average over {range} days</span>
          </div>
          <LineChart data={brightness} max={100} format={(v) => `${v}%`} yTicks={[50, 100]} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Focus minutes</h3>
            <span className="muted">Last 14 days</span>
          </div>
          <BarChart data={focus} format={(v) => `${v} min`} max={60} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Strongest days</h3>
            <span className="muted">{bestDay && bestDay.value > 0 ? `${bestDay.label} is your best day` : 'Last 12 weeks'}</span>
          </div>
          <BarChart data={weekdays} format={(v) => `${v}% brightness`} max={100} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Mood</h3>
            <span className="muted">
              {moodLogged.length ? `${moodLabel(moodLogged.reduce((n, m) => n + m.value, 0) / moodLogged.length)} on average` : 'Log moods from the 365 view or journal'}
            </span>
          </div>
          <LineChart data={mood} max={5} area={false} format={moodLabel} yTicks={[1, 3, 5]} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Habit consistency</h3>
            <span className="muted">Last 30 days</span>
          </div>
          {habits.length ? (
            <ul className="habit-board">
              {habits.map(({ h, rate }) => {
                const Icon = habitIcon(h.icon);
                return (
                  <li key={h.id}>
                    <Icon />
                    <span className="habit-board-name">{h.name}</span>
                    <span className="num">{Math.round(rate * 100)}%</span>
                    <Bar value={rate} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty icon={ChartColumn} title="No habits to measure">
              Create a habit and its consistency shows up here.
            </Empty>
          )}
        </section>
      </div>
    </div>
  );
}
