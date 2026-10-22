import { getState, subscribe, update, isReady } from './store.js';
import { computeStats, rankFor } from '../lib/progress.js';
import { ACHIEVEMENTS } from '../lib/achievements.js';
import { emit } from '../lib/events.js';
import { systemNotify } from '../lib/platform.js';
import { sound } from '../lib/sound.js';

let timer = null;

function check() {
  const s = getState();
  if (!isReady() || !s.profile.onboarded) return;
  const stats = computeStats(s);

  const unlocked = ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && a.test(stats));
  const levelUp = stats.level > (s.lastLevel ?? 1);
  if (!unlocked.length && !levelUp) return;

  update((d) => {
    for (const a of unlocked) d.achievements[a.id] = new Date().toISOString();
    d.lastLevel = Math.max(d.lastLevel ?? 1, stats.level);
  });

  const notifyOn = s.settings.notifications.enabled && s.settings.notifications.achievements;
  unlocked.forEach((a, i) => {
    setTimeout(() => {
      emit('achievement', a);
      if (s.settings.sound) sound.achievement();
      if (notifyOn && document.hidden) systemNotify({ title: `Achievement unlocked: ${a.title}`, body: a.desc, view: 'achievements' });
    }, 700 + i * 900);
  });

  if (levelUp) {
    const oldRank = rankFor(s.lastLevel ?? 1);
    const rankUp = stats.rank.name !== oldRank.name;
    setTimeout(() => {
      emit('levelup', { level: stats.level, rank: stats.rank, rankUp });
      if (s.settings.sound) sound.levelUp();
      if (notifyOn && document.hidden) {
        systemNotify({ title: `Level ${stats.level}`, body: rankUp ? `New rank: ${stats.rank.name}. ${stats.rank.line}` : 'Keep climbing.', view: 'achievements' });
      }
    }, 400);
  }
}

export function startWatcher() {
  const s = getState();
  if (s.profile.onboarded) {
    const stats = computeStats(s);
    const silent = ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && a.test(stats));
    if (silent.length || stats.level > s.lastLevel) {
      update((d) => {
        for (const a of silent) d.achievements[a.id] = new Date().toISOString();
        d.lastLevel = Math.max(d.lastLevel ?? 1, stats.level);
      });
    }
  }
  return subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(check, 120);
  });
}
