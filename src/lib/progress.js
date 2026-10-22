import { todayKey, addDays, parseYmd, ymd, lastNDays } from './dates.js';

export const XP = {
  day: 20,
  task: 10,
  taskHigh: 5,
  habit: 5,
  focusMinute: 1,
  journal: 15,
  milestone: 25,
  goal: 150,
};

export const RANKS = [
  { level: 1, name: 'Spark', line: 'Every star starts as a spark.' },
  { level: 3, name: 'Ember', line: 'The fire is catching.' },
  { level: 5, name: 'Comet', line: 'You are leaving a trail.' },
  { level: 8, name: 'Moon', line: 'Steady. Reliable. Rising every night.' },
  { level: 11, name: 'Planet', line: 'You have your own gravity now.' },
  { level: 14, name: 'Star', line: 'You make your own light.' },
  { level: 17, name: 'Nova', line: 'A sudden, brilliant burst.' },
  { level: 20, name: 'Pulsar', line: 'Precise. Relentless. On beat.' },
  { level: 24, name: 'Nebula', line: 'Where new stars are born.' },
  { level: 28, name: 'Galaxy', line: 'Billions of small wins, one shape.' },
  { level: 32, name: 'Supernova', line: 'Seen from light-years away.' },
  { level: 37, name: 'Beyond Human', line: 'You went past the edge of the map.' },
];

export const xpForLevel = (level) => 40 * (level - 1) ** 2 + 60 * (level - 1);

export function levelFromXp(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return { level, floor, ceil, into: xp - floor, span: ceil - floor, pct: (xp - floor) / (ceil - floor) };
}

export function rankFor(level) {
  let rank = RANKS[0];
  for (const r of RANKS) if (level >= r.level) rank = r;
  return rank;
}

export function nextRank(level) {
  return RANKS.find((r) => r.level > level) ?? null;
}

export const habitScheduled = (habit, key) => {
  const days = habit.days?.length ? habit.days : [0, 1, 2, 3, 4, 5, 6];
  return days.includes(parseYmd(key).getDay());
};

export function habitStreak(habit, today = todayKey()) {
  const created = habit.createdAt ? ymd(new Date(habit.createdAt)) : '1970-01-01';
  let cursor = today;
  if (habitScheduled(habit, cursor) && !habit.log?.[cursor]) cursor = addDays(cursor, -1);
  let streak = 0;
  for (let i = 0; i < 1000 && cursor >= created; i += 1) {
    if (habitScheduled(habit, cursor)) {
      if (!habit.log?.[cursor]) break;
      streak += 1;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function habitBestStreak(habit) {
  const keys = Object.keys(habit.log ?? {}).filter((k) => habit.log[k]).sort();
  if (!keys.length) return 0;
  let best = 0;
  let run = 0;
  let cursor = keys[0];
  const last = keys[keys.length - 1];
  for (let i = 0; i < 4000 && cursor <= last; i += 1) {
    if (habitScheduled(habit, cursor)) {
      if (habit.log[cursor]) {
        run += 1;
        best = Math.max(best, run);
      } else run = 0;
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

export function habitRate(habit, days = 30, today = todayKey()) {
  const created = habit.createdAt ? ymd(new Date(habit.createdAt)) : today;
  let due = 0;
  let done = 0;
  for (const key of lastNDays(days, today)) {
    if (key < created || !habitScheduled(habit, key)) continue;
    due += 1;
    if (habit.log?.[key]) done += 1;
  }
  return due ? done / due : 0;
}

export function dayStreak(days, today = todayKey()) {
  let cursor = today;
  if (!days[cursor]?.done) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days[cursor]?.done) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestDayStreak(days) {
  const keys = Object.keys(days).filter((k) => days[k]?.done).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of keys) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

export const journalHasContent = (e) =>
  Boolean(e && ((e.gratitude ?? []).some((g) => g?.trim()) || e.win?.trim() || e.lesson?.trim() || e.tomorrow?.trim() || e.notes?.trim()));

const scorerCache = new WeakMap();

export function scorer(s) {
  if (scorerCache.has(s)) return scorerCache.get(s);
  const byDate = new Map();
  for (const t of s.tasks) {
    const e = byDate.get(t.date) ?? { total: 0, done: 0 };
    e.total += 1;
    if (t.done) e.done += 1;
    byDate.set(t.date, e);
  }
  const habits = s.habits
    .filter((h) => !h.archived)
    .map((h) => ({ h, created: h.createdAt ? ymd(new Date(h.createdAt)) : '' }));

  const fn = (key) => {
    const e = byDate.get(key);
    let total = e?.total ?? 0;
    let done = e?.done ?? 0;
    for (const { h, created } of habits) {
      if (key < created || !habitScheduled(h, key)) continue;
      total += 1;
      if (h.log?.[key]) done += 1;
    }
    const lit = Boolean(s.days[key]?.done);
    if (!total) return lit ? 1 : 0;
    const ratio = done / total;
    return lit ? Math.max(0.55, ratio) : ratio * 0.8;
  };
  scorerCache.set(s, fn);
  return fn;
}

export const dayScore = (s, key) => scorer(s)(key);

const cache = new WeakMap();

export function computeStats(s) {
  if (cache.has(s)) return cache.get(s);
  const today = todayKey();
  const litDays = Object.keys(s.days).filter((k) => s.days[k]?.done);
  const tasksDone = s.tasks.filter((t) => t.done);
  const habitChecks = s.habits.reduce((n, h) => n + Object.values(h.log ?? {}).filter(Boolean).length, 0);
  const focusMinutes = s.focus.reduce((n, f) => n + (f.minutes || 0), 0);
  const journalCount = Object.values(s.journal).filter(journalHasContent).length;
  const milestonesDone = s.goals.reduce((n, g) => n + (g.milestones ?? []).filter((m) => m.done).length, 0);
  const goalsDone = s.goals.filter((g) => g.completedAt).length;

  const xp =
    litDays.length * XP.day +
    tasksDone.length * XP.task +
    tasksDone.filter((t) => t.priority === 1).length * XP.taskHigh +
    habitChecks * XP.habit +
    focusMinutes * XP.focusMinute +
    journalCount * XP.journal +
    milestonesDone * XP.milestone +
    goalsDone * XP.goal;

  const lvl = levelFromXp(xp);
  const habitStreaks = s.habits.filter((h) => !h.archived).map((h) => habitStreak(h, today));

  const perfectDays = litDays.filter((k) => {
    const tasks = s.tasks.filter((t) => t.date === k);
    const habits = s.habits.filter((h) => !h.archived && habitScheduled(h, k));
    return tasks.length + habits.length >= 3 && tasks.every((t) => t.done) && habits.every((h) => h.log?.[k]);
  }).length;

  const stats = {
    xp,
    ...lvl,
    rank: rankFor(lvl.level),
    next: nextRank(lvl.level),
    litDays: litDays.length,
    streak: dayStreak(s.days, today),
    bestStreak: bestDayStreak(s.days),
    tasksDone: tasksDone.length,
    tasksTotal: s.tasks.length,
    habitChecks,
    bestHabitStreak: Math.max(0, ...s.habits.map(habitBestStreak)),
    currentHabitStreak: Math.max(0, ...habitStreaks),
    focusMinutes,
    focusSessions: s.focus.length,
    journalCount,
    milestonesDone,
    goalsDone,
    goalsTotal: s.goals.length,
    habitsTotal: s.habits.filter((h) => !h.archived).length,
    visionCount: s.vision.length,
    earlyTasks: tasksDone.filter((t) => t.doneAt && new Date(t.doneAt).getHours() < 7).length,
    lateTasks: tasksDone.filter((t) => t.doneAt && new Date(t.doneAt).getHours() >= 23).length,
    longestFocus: Math.max(0, ...s.focus.map((f) => f.minutes || 0)),
    perfectDays,
    moodsLogged: Object.values(s.days).filter((d) => d?.mood).length,
  };
  cache.set(s, stats);
  return stats;
}

export function goalProgress(goal) {
  const ms = goal.milestones ?? [];
  if (goal.completedAt) return 1;
  if (!ms.length) return (goal.progress ?? 0) / 100;
  return ms.filter((m) => m.done).length / ms.length;
}
