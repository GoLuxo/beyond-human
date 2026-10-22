import { update, uid } from './store.js';
import { todayKey } from '../lib/dates.js';
import { journalHasContent } from '../lib/progress.js';

const now = () => new Date().toISOString();

export function completeOnboarding({ name, northStar, why, habits, wake, reflect, notifications }) {
  update((s) => {
    s.profile.name = name.trim();
    s.profile.northStar = northStar.trim();
    s.profile.why = why.trim();
    s.profile.onboarded = true;
    s.profile.createdAt = now();
    s.settings.notifications.enabled = notifications;
    s.settings.notifications.morning.time = wake;
    s.settings.notifications.evening.time = reflect;
    for (const h of habits) {
      s.habits.push({ id: uid(), name: h.name, icon: h.icon, days: [0, 1, 2, 3, 4, 5, 6], reminder: null, log: {}, createdAt: now(), archived: false });
    }
    if (northStar.trim()) {
      s.goals.push({ id: uid(), title: northStar.trim(), why: why.trim(), category: 'craft', deadline: `${new Date().getFullYear()}-12-31`, milestones: [], progress: 0, createdAt: now(), completedAt: null, northStar: true });
    }
  });
}

export function updateProfile(patch) {
  update((s) => {
    Object.assign(s.profile, patch);
  });
}

export function updateSettings(patch) {
  update((s) => {
    Object.assign(s.settings, patch);
  });
}

export function updateNotifications(patch) {
  update((s) => {
    Object.assign(s.settings.notifications, patch);
  });
}

export function setDayLit(key, lit) {
  update((s) => {
    const day = s.days[key] ?? (s.days[key] = {});
    day.done = lit;
    day.litAt = lit ? now() : null;
  });
}

export function setDayMood(key, mood) {
  update((s) => {
    const day = s.days[key] ?? (s.days[key] = {});
    day.mood = day.mood === mood ? null : mood;
  });
}

export function setDayNote(key, note) {
  update((s) => {
    const day = s.days[key] ?? (s.days[key] = {});
    day.note = note;
  });
}

export function addTask(task) {
  const id = uid();
  update((s) => {
    s.tasks.push({
      id,
      title: task.title.trim(),
      date: task.date ?? todayKey(),
      time: task.time || null,
      duration: task.duration ?? 30,
      priority: task.priority ?? 2,
      goalId: task.goalId || null,
      notes: task.notes ?? '',
      done: false,
      doneAt: null,
      createdAt: now(),
    });
  });
  return id;
}

export function updateTask(id, patch) {
  update((s) => {
    const t = s.tasks.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
  });
}

export function toggleTask(id) {
  let done = false;
  update((s) => {
    const t = s.tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    t.doneAt = t.done ? now() : null;
    done = t.done;
  });
  return done;
}

export function deleteTask(id) {
  update((s) => {
    s.tasks = s.tasks.filter((t) => t.id !== id);
  });
}

export function moveUnfinished(fromKey, toKey) {
  let moved = 0;
  update((s) => {
    for (const t of s.tasks) {
      if (t.date === fromKey && !t.done) {
        t.date = toKey;
        moved += 1;
      }
    }
  });
  return moved;
}

export function addHabit(habit) {
  update((s) => {
    s.habits.push({
      id: uid(),
      name: habit.name.trim(),
      icon: habit.icon ?? 'sparkles',
      days: habit.days?.length ? habit.days : [0, 1, 2, 3, 4, 5, 6],
      reminder: habit.reminder || null,
      log: {},
      createdAt: now(),
      archived: false,
    });
  });
}

export function updateHabit(id, patch) {
  update((s) => {
    const h = s.habits.find((x) => x.id === id);
    if (h) Object.assign(h, patch);
  });
}

export function toggleHabit(id, key = todayKey()) {
  let done = false;
  update((s) => {
    const h = s.habits.find((x) => x.id === id);
    if (!h) return;
    if (h.log[key]) delete h.log[key];
    else h.log[key] = true;
    done = Boolean(h.log[key]);
  });
  return done;
}

export function deleteHabit(id) {
  update((s) => {
    s.habits = s.habits.filter((h) => h.id !== id);
  });
}

export function addGoal(goal) {
  const id = uid();
  update((s) => {
    s.goals.push({
      id,
      title: goal.title.trim(),
      why: goal.why?.trim() ?? '',
      category: goal.category ?? 'craft',
      deadline: goal.deadline || null,
      milestones: (goal.milestones ?? []).filter((m) => m.trim()).map((m) => ({ id: uid(), title: m.trim(), done: false })),
      progress: 0,
      createdAt: now(),
      completedAt: null,
    });
  });
  return id;
}

export function updateGoal(id, patch) {
  update((s) => {
    const g = s.goals.find((x) => x.id === id);
    if (g) Object.assign(g, patch);
  });
}

export function deleteGoal(id) {
  update((s) => {
    s.goals = s.goals.filter((g) => g.id !== id);
    for (const t of s.tasks) if (t.goalId === id) t.goalId = null;
  });
}

export function setGoalComplete(id, complete) {
  update((s) => {
    const g = s.goals.find((x) => x.id === id);
    if (g) g.completedAt = complete ? now() : null;
  });
}

export function addMilestone(goalId, title) {
  update((s) => {
    const g = s.goals.find((x) => x.id === goalId);
    if (g && title.trim()) g.milestones.push({ id: uid(), title: title.trim(), done: false });
  });
}

export function toggleMilestone(goalId, milestoneId) {
  let done = false;
  update((s) => {
    const m = s.goals.find((x) => x.id === goalId)?.milestones.find((x) => x.id === milestoneId);
    if (!m) return;
    m.done = !m.done;
    done = m.done;
  });
  return done;
}

export function deleteMilestone(goalId, milestoneId) {
  update((s) => {
    const g = s.goals.find((x) => x.id === goalId);
    if (g) g.milestones = g.milestones.filter((m) => m.id !== milestoneId);
  });
}

export function setJournal(key, patch) {
  update((s) => {
    const entry = { ...(s.journal[key] ?? {}), ...patch, updatedAt: now() };
    if (journalHasContent(entry) || entry.mood) s.journal[key] = entry;
    else delete s.journal[key];
  });
}

export function logFocus({ minutes, taskId, label }) {
  update((s) => {
    s.focus.push({ id: uid(), start: now(), date: todayKey(), minutes, taskId: taskId || null, label: label || '' });
  });
}

export function addVision(item) {
  update((s) => {
    s.vision.push({ id: uid(), createdAt: now(), ...item });
  });
}

export function updateVision(id, patch) {
  update((s) => {
    const v = s.vision.find((x) => x.id === id);
    if (v) Object.assign(v, patch);
  });
}

export function deleteVision(id) {
  update((s) => {
    s.vision = s.vision.filter((v) => v.id !== id);
  });
}
