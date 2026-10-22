import { useSyncExternalStore } from 'react';
import { produce } from 'immer';
import { saveData } from '../lib/platform.js';

export const SCHEMA_VERSION = 1;

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    profile: { name: '', northStar: '', why: '', createdAt: new Date().toISOString(), onboarded: false },
    settings: {
      theme: 'dark',
      sound: true,
      reduceMotion: false,
      graphics: 'high',
      showFps: false,
      minimizeToTray: true,
      weekStart: 1,
      dayStart: 6,
      dayEnd: 23,
      focusMinutes: 25,
      shortBreak: 5,
      longBreak: 15,
      sessionsBeforeLong: 4,
      notifications: {
        enabled: true,
        morning: { on: true, time: '07:00' },
        evening: { on: true, time: '21:30' },
        streak: { on: true, time: '20:00' },
        quote: { on: true, time: '13:00' },
        habits: true,
        planner: true,
        plannerLead: 5,
        focus: true,
        achievements: true,
      },
    },
    days: {},
    tasks: [],
    habits: [],
    goals: [],
    journal: {},
    focus: [],
    vision: [],
    achievements: {},
    lastLevel: 1,
  };
}

function mergeDefaults(base, saved) {
  if (Array.isArray(base)) return Array.isArray(saved) ? saved : base;
  if (base && typeof base === 'object') {
    const out = { ...(saved && typeof saved === 'object' ? saved : {}) };
    for (const key of Object.keys(base)) out[key] = mergeDefaults(base[key], saved?.[key]);
    return out;
  }
  return saved === undefined || saved === null ? base : saved;
}

export function hydrate(saved) {
  if (!saved || typeof saved !== 'object') return defaultState();
  const merged = mergeDefaults(defaultState(), saved);
  for (const key of ['days', 'journal', 'achievements']) {
    merged[key] = saved[key] && typeof saved[key] === 'object' ? saved[key] : {};
  }
  merged.version = SCHEMA_VERSION;
  return merged;
}

export function isValidBackup(data) {
  return Boolean(data && typeof data === 'object' && data.profile && data.settings && Array.isArray(data.tasks));
}

let state = defaultState();
let ready = false;
const listeners = new Set();
let saveTimer = null;

function emitChange() {
  for (const l of listeners) l();
}

export function initStore(saved) {
  state = hydrate(saved);
  ready = true;
  emitChange();
}

export const getState = () => state;
export const isReady = () => ready;

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function update(recipe) {
  const next = produce(state, recipe);
  if (next === state) return;
  state = next;
  emitChange();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveData(state), 300);
}

export function replaceState(next) {
  state = hydrate(next);
  emitChange();
  saveData(state);
}

export function flushSave() {
  clearTimeout(saveTimer);
  if (ready) saveData(state, true);
}

export function useAppState() {
  return useSyncExternalStore(subscribe, getState);
}

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
