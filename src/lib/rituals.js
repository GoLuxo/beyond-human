import { getState } from '../state/store.js';
import { setDayLit } from '../state/actions.js';
import { play } from './feedback.js';
import { celebrate, toast } from './events.js';
import { todayKey, dayOfYear, parseYmd } from './dates.js';
import { dayStreak } from './progress.js';
import { Sparkles } from 'lucide-react';

export function toggleLit(key = todayKey(), source) {
  const lit = !getState().days[key]?.done;
  setDayLit(key, lit);
  if (!lit) {
    play('uncheck');
    return false;
  }
  play('lightUp');
  celebrate(source, 1.8);
  if (key === todayKey()) {
    const streak = dayStreak(getState().days);
    toast(streak > 1 ? `Day ${dayOfYear(parseYmd(key))} is lit. ${streak} days in a row.` : `Day ${dayOfYear(parseYmd(key))} is lit. Keep it going tomorrow.`, { icon: Sparkles });
  } else {
    toast('Day lit', { icon: Sparkles });
  }
  return true;
}
