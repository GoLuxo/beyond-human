import { useSyncExternalStore } from 'react';
import { getState } from '../state/store.js';
import { logFocus } from '../state/actions.js';
import { systemNotify } from './platform.js';
import { sound, startAmbient, stopAmbient, setAmbientVolume } from './sound.js';
import { emit } from './events.js';

const listeners = new Set();
let interval = null;

const durationFor = (mode) => {
  const s = getState().settings;
  const min = mode === 'focus' ? s.focusMinutes : mode === 'short' ? s.shortBreak : s.longBreak;
  return Math.max(1, Number(min) || 1) * 60000;
};

let snap = {
  mode: 'focus',
  status: 'idle',
  duration: 25 * 60000,
  remaining: 25 * 60000,
  endsAt: 0,
  cycle: 0,
  taskId: null,
  ambient: 'off',
  volume: 0.4,
};

function set(patch) {
  snap = { ...snap, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useFocusTimer() {
  return useSyncExternalStore(subscribe, () => snap);
}

export const getTimer = () => snap;

function loop() {
  clearInterval(interval);
  interval = setInterval(() => {
    const remaining = Math.max(0, snap.endsAt - Date.now());
    if (remaining <= 0) complete();
    else set({ remaining });
  }, 250);
}

function notifyIfAllowed(title, body) {
  const n = getState().settings.notifications;
  if (n.enabled && n.focus) systemNotify({ title, body, view: 'focus' });
}

function finishTo(nextMode) {
  clearInterval(interval);
  const duration = durationFor(nextMode);
  set({ mode: nextMode, status: 'idle', duration, remaining: duration, endsAt: 0 });
}

function complete() {
  const { mode, duration, taskId } = snap;
  const s = getState().settings;
  if (s.sound) sound.bell();
  if (mode === 'focus') {
    const minutes = Math.round(duration / 60000);
    const task = getState().tasks.find((t) => t.id === taskId);
    logFocus({ minutes, taskId, label: task?.title ?? '' });
    const cycle = snap.cycle + 1;
    const long = cycle % (s.sessionsBeforeLong || 4) === 0;
    set({ cycle });
    emit('celebrate', { x: window.innerWidth / 2, y: window.innerHeight / 2, intensity: 1.4 });
    notifyIfAllowed('Focus session complete', `${minutes} minutes of deep work logged. Take a ${long ? s.longBreak : s.shortBreak}-minute break.`);
    finishTo(long ? 'long' : 'short');
  } else {
    notifyIfAllowed("Break's over", 'Back to it. Your next focus session is ready.');
    finishTo('focus');
  }
}

export const timer = {
  start() {
    if (snap.status === 'running') return;
    const remaining = snap.status === 'paused' ? snap.remaining : durationFor(snap.mode);
    const duration = snap.status === 'paused' ? snap.duration : remaining;
    if (getState().settings.sound) sound.start();
    set({ status: 'running', endsAt: Date.now() + remaining, remaining, duration });
    if (snap.ambient !== 'off' && snap.mode === 'focus') startAmbient(snap.ambient, snap.volume);
    loop();
  },
  pause() {
    if (snap.status !== 'running') return;
    clearInterval(interval);
    set({ status: 'paused', remaining: Math.max(0, snap.endsAt - Date.now()) });
    stopAmbient();
  },
  reset() {
    clearInterval(interval);
    stopAmbient();
    finishTo(snap.mode);
  },
  skip() {
    stopAmbient();
    if (snap.mode === 'focus' && snap.status !== 'idle') {
      const elapsed = Math.floor((snap.duration - snap.remaining) / 60000);
      if (elapsed >= 1) {
        const task = getState().tasks.find((t) => t.id === snap.taskId);
        logFocus({ minutes: elapsed, taskId: snap.taskId, label: task?.title ?? '' });
      }
    }
    finishTo(snap.mode === 'focus' ? 'short' : 'focus');
  },
  setMode(mode) {
    if (snap.status === 'running') stopAmbient();
    clearInterval(interval);
    finishTo(mode);
  },
  setTask(taskId) {
    set({ taskId });
  },
  setAmbient(ambient) {
    set({ ambient });
    if (ambient === 'off') stopAmbient();
    else if (snap.status === 'running' && snap.mode === 'focus') startAmbient(ambient, snap.volume);
  },
  setVolume(volume) {
    set({ volume });
    setAmbientVolume(volume);
  },
  syncDurations() {
    if (snap.status !== 'idle') return;
    const duration = durationFor(snap.mode);
    if (duration !== snap.duration) set({ duration, remaining: duration });
  },
};
