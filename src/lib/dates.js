const pad = (n) => String(n).padStart(2, '0');

export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayKey = () => ymd(new Date());

export function addDays(key, n) {
  const d = parseYmd(key);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export function diffDays(a, b) {
  return Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
}

export function dayOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86400000) + 1;
}

export const isLeap = (y) => new Date(y, 1, 29).getMonth() === 1;
export const daysInYear = (y) => (isLeap(y) ? 366 : 365);
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

export function yearDays(y) {
  const out = [];
  const d = new Date(y, 0, 1);
  while (d.getFullYear() === y) {
    out.push(ymd(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function weekDays(key, weekStart = 1) {
  const d = parseYmd(key);
  const offset = (d.getDay() - weekStart + 7) % 7;
  d.setDate(d.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return ymd(x);
  });
}

export function lastNDays(n, end = todayKey()) {
  return Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
}

const fmt = (opts) => new Intl.DateTimeFormat(undefined, opts);
const longDate = fmt({ weekday: 'long', month: 'long', day: 'numeric' });
const shortDate = fmt({ month: 'short', day: 'numeric' });
const fullDate = fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const weekdayShort = fmt({ weekday: 'short' });
const weekdayNarrow = fmt({ weekday: 'narrow' });
const monthShort = fmt({ month: 'short' });
const monthLong = fmt({ month: 'long' });

export const formatLong = (key) => longDate.format(parseYmd(key));
export const formatShort = (key) => shortDate.format(parseYmd(key));
export const formatFull = (key) => fullDate.format(parseYmd(key));
export const formatWeekday = (key) => weekdayShort.format(parseYmd(key));
export const formatWeekdayNarrow = (key) => weekdayNarrow.format(parseYmd(key));
export const monthName = (m, long = false) => (long ? monthLong : monthShort).format(new Date(2026, m, 1));

export function weekdayLabels(weekStart = 1) {
  return Array.from({ length: 7 }, (_, i) => {
    const day = (weekStart + i) % 7;
    return { day, short: weekdayShort.format(new Date(2026, 1, day + 1)), narrow: weekdayNarrow.format(new Date(2026, 1, day + 1)) };
  });
}

export function relativeDays(key) {
  const n = diffDays(todayKey(), key);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1) return `In ${n} days`;
  return `${-n} days ago`;
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
}

export const toMinutes = (hm) => {
  if (!hm) return null;
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

export function formatTime(hm) {
  if (!hm) return '';
  const [h, m] = hm.split(':').map(Number);
  return fmt({ hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, h, m));
}

export function formatHour(h) {
  return fmt({ hour: 'numeric' }).format(new Date(2026, 0, 1, h, 0));
}
