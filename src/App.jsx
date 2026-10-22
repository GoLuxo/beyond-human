import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState, getState } from './state/store.js';
import { addTask, updateSettings } from './state/actions.js';
import { computeStats } from './lib/progress.js';
import { on, toast } from './lib/events.js';
import { win, system } from './lib/platform.js';
import { timer } from './lib/focusTimer.js';
import { toggleLit } from './lib/rituals.js';
import { todayKey } from './lib/dates.js';
import { AppContext } from './AppContext.js';

import GpuBackdrop from './components/GpuBackdrop.jsx';
import Celebration from './components/Celebration.jsx';
import TitleBar from './components/TitleBar.jsx';
import Sidebar, { NAV } from './components/Sidebar.jsx';
import Toasts from './components/Toasts.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LevelUp from './components/LevelUp.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import { TaskModal, HabitModal, GoalModal } from './components/editors.jsx';
import ShareModal from './components/ShareModal.jsx';

import Onboarding from './views/Onboarding.jsx';
import Today from './views/Today.jsx';
import Planner from './views/Planner.jsx';
import Year from './views/Year.jsx';
import Goals from './views/Goals.jsx';
import Habits from './views/Habits.jsx';
import Focus from './views/Focus.jsx';
import Journal from './views/Journal.jsx';
import Vision from './views/Vision.jsx';
import Insights from './views/Insights.jsx';
import Achievements from './views/Achievements.jsx';
import Settings from './views/Settings.jsx';

const VIEWS = { today: Today, planner: Planner, year: Year, goals: Goals, habits: Habits, focus: Focus, journal: Journal, vision: Vision, insights: Insights, achievements: Achievements, settings: Settings };

export default function App() {
  const state = useAppState();
  const { settings, profile } = state;
  const stats = computeStats(state);
  const reduced = settings.reduceMotion;

  const [view, setView] = useState('today');
  const [palette, setPalette] = useState(false);
  const [taskModal, setTaskModal] = useState({ open: false });
  const [habitModal, setHabitModal] = useState({ open: false });
  const [goalModal, setGoalModal] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [focusGoal, setFocusGoal] = useState(null);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.motion = reduced ? 'reduced' : 'full';
    win.setBackground(settings.theme === 'light' ? '#ffffff' : '#000000');
  }, [settings.theme, reduced]);

  useEffect(() => {
    timer.syncDurations();
  }, [settings.focusMinutes, settings.shortBreak, settings.longBreak]);

  const navigate = useCallback((v) => {
    if (VIEWS[v]) setView(v);
  }, []);

  const ctx = useMemo(
    () => ({
      navigate,
      openTask: (opts = {}) => setTaskModal({ open: true, task: opts.task ?? null, defaults: opts.defaults ?? null }),
      openHabit: (habit = null) => setHabitModal({ open: true, habit }),
      openGoal: () => setGoalModal(true),
      openShare: () => setShareOpen(true),
      focusGoalId: focusGoal,
      setFocusGoal,
    }),
    [navigate, focusGoal],
  );

  const run = useCallback(
    (cmd, text = '') => {
      if (cmd.startsWith('go:')) return navigate(cmd.slice(3));
      switch (cmd) {
        case 'new-task':
          return ctx.openTask();
        case 'quick-task':
          addTask({ title: text, date: todayKey() });
          return toast(`Added to today: ${text}`);
        case 'new-habit':
          navigate('habits');
          return ctx.openHabit();
        case 'new-goal':
          navigate('goals');
          return ctx.openGoal();
        case 'checkin':
          navigate('today');
          if (!getState().days[todayKey()]?.done) setTimeout(() => toggleLit(todayKey()), 350);
          else toast('Today is already lit');
          return undefined;
        case 'focus-start':
          navigate('focus');
          setTimeout(() => timer.start(), 300);
          return undefined;
        case 'share':
          return setShareOpen(true);
        case 'toggle-theme':
          return updateSettings({ theme: getState().settings.theme === 'light' ? 'dark' : 'light' });
        default:
          return undefined;
      }
    },
    [ctx, navigate],
  );

  useEffect(() => {
    const offs = [on('navigate', navigate), system.onNavigate(navigate), system.onCommand((c) => run(c)), on('command', (c) => run(c))];
    return () => offs.forEach((off) => off());
  }, [navigate, run]);

  useEffect(() => {
    const onKey = (e) => {
      if (!getState().profile.onboarded) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        ctx.openTask();
      } else if (mod && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        navigate(NAV[Number(e.key) - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctx, navigate]);

  const View = VIEWS[view];

  return (
    <AppContext.Provider value={ctx}>
      <div className="app">
        <GpuBackdrop theme={settings.theme} quality={settings.graphics} reduced={reduced} />
        <TitleBar onSearch={profile.onboarded ? () => setPalette(true) : null} showFps={settings.showFps} />

        {!profile.onboarded ? (
          <Onboarding />
        ) : (
          <div className="shell">
            <Sidebar view={view} onNavigate={navigate} profile={profile} stats={stats} />
            <main className="main">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={view}
                  className="page"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, filter: 'blur(4px)' }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ErrorBoundary resetKey={view}>
                    <View />
                  </ErrorBoundary>
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        )}

        <TaskModal open={taskModal.open} task={taskModal.task} defaults={taskModal.defaults} goals={state.goals} onClose={() => setTaskModal((m) => ({ ...m, open: false }))} />
        <HabitModal open={habitModal.open} habit={habitModal.habit} weekStart={settings.weekStart} onClose={() => setHabitModal((m) => ({ ...m, open: false }))} />
        <GoalModal
          open={goalModal}
          onClose={() => setGoalModal(false)}
          onCreated={(id) => {
            navigate('goals');
            setFocusGoal(id);
          }}
        />
        <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
        <CommandPalette open={palette} onClose={() => setPalette(false)} run={run} />
        <Celebration reduced={reduced} />
        <Toasts />
        <LevelUp />
      </div>
    </AppContext.Provider>
  );
}

