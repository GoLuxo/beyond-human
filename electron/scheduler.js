const quotes = require('../shared/quotes.json');

const TICK_MS = 20 * 1000;
const fired = new Set();
let firedDay = '';
let timer = null;

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toMin = (hm) => {
  const [h, m] = String(hm).split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

const clock = (hm) => {
  const [h, m] = String(hm).split(':').map(Number);
  return new Date(2026, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86400000) + 1;
}

function daysInYear(y) {
  return new Date(y, 1, 29).getMonth() === 1 ? 366 : 365;
}

function dailyQuote(d) {
  const seed = d.getFullYear() * 1000 + dayOfYear(d);
  return quotes[seed % quotes.length];
}

function currentStreak(days, now) {
  const isDone = (date) => Boolean(days?.[ymd(date)]?.done);
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!isDone(cursor)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (isDone(cursor)) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function habitDueToday(habit, now) {
  if (habit.archived) return false;
  const days = Array.isArray(habit.days) && habit.days.length ? habit.days : [0, 1, 2, 3, 4, 5, 6];
  return days.includes(now.getDay());
}

function tick(getData, notify) {
  const data = getData();
  if (!data?.profile?.onboarded) return;
  const n = data.settings?.notifications;
  if (!n?.enabled) return;

  const now = new Date();
  const today = ymd(now);
  if (today !== firedDay) {
    fired.clear();
    firedDay = today;
  }
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const due = (key, minute) => {
    if (minute == null || minute < 0) return false;
    if (nowMin < minute || nowMin > minute + 1) return false;
    if (fired.has(key)) return false;
    fired.add(key);
    return true;
  };

  const tasksToday = (data.tasks ?? []).filter((t) => t.date === today);
  const habitsToday = (data.habits ?? []).filter((h) => habitDueToday(h, now));
  const name = data.profile?.name ? `, ${data.profile.name}` : '';

  if (n.morning?.on && due('morning', toMin(n.morning.time))) {
    const open = tasksToday.filter((t) => !t.done).length;
    const q = dailyQuote(now);
    notify({
      title: `Day ${dayOfYear(now)} of ${daysInYear(now.getFullYear())}. Rise${name}.`,
      body: `${open} ${open === 1 ? 'task' : 'tasks'} and ${habitsToday.length} ${habitsToday.length === 1 ? 'habit' : 'habits'} today. "${q.text}"`,
      view: 'today',
    });
    for (const g of data.goals ?? []) {
      if (!g.completedAt && g.deadline === today) {
        notify({ title: 'Goal deadline today', body: `${g.title}. Finish strong.`, view: 'goals' });
      }
    }
  }

  if (n.habits) {
    for (const h of habitsToday) {
      if (!h.reminder || h.log?.[today]) continue;
      if (due(`habit:${h.id}`, toMin(h.reminder))) {
        notify({ title: `Time for: ${h.name}`, body: 'Check it off and keep the chain alive.', view: 'habits' });
      }
    }
  }

  if (n.planner) {
    const lead = Number(n.plannerLead ?? 5);
    for (const t of tasksToday) {
      if (t.done || !t.time) continue;
      const start = toMin(t.time);
      if (start == null) continue;
      if (due(`task:${t.id}`, start - lead)) {
        notify({
          title: lead > 0 ? `Starting in ${lead} min` : 'Starting now',
          body: `${t.title} at ${clock(t.time)}`,
          view: 'planner',
        });
      }
    }
  }

  if (n.quote?.on && due('quote', toMin(n.quote.time))) {
    const q = quotes[(dayOfYear(now) * 7 + 3) % quotes.length];
    notify({ title: 'Fuel for the afternoon', body: `"${q.text}" ${q.author}`, view: 'today' });
  }

  if (n.streak?.on && !data.days?.[today]?.done && due('streak', toMin(n.streak.time))) {
    const streak = currentStreak(data.days, now);
    notify({
      title: streak > 0 ? `Your ${streak}-day streak ends at midnight` : 'Today still counts',
      body: streak > 0 ? 'Light up today to keep it going.' : 'Light up today and start a new streak.',
      view: 'today',
    });
  }

  if (n.evening?.on && !data.journal?.[today] && due('evening', toMin(n.evening.time))) {
    notify({
      title: 'How did today go?',
      body: 'Write down one win and one lesson before you sleep.',
      view: 'journal',
    });
  }
}

function start(getData, notify) {
  stop();
  timer = setInterval(() => tick(getData, notify), TICK_MS);
  tick(getData, notify);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, dayOfYear, daysInYear, currentStreak };
