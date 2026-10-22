import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, Bell } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { Switch } from '../components/ui.jsx';
import { completeOnboarding, setDayLit } from '../state/actions.js';
import { HABIT_SUGGESTIONS, habitIcon } from '../lib/icons.js';
import { dayOfYear, daysInYear, todayKey } from '../lib/dates.js';
import { celebrate } from '../lib/events.js';
import { sound } from '../lib/sound.js';
import { systemNotify } from '../lib/platform.js';

const WORD = 'Beyond Human';

function Intro({ onNext }) {
  return (
    <div className="ob-intro">
      <motion.div
        className="ob-mark"
        initial={{ scale: 0.6, opacity: 0, rotate: -40 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Logo size={92} />
      </motion.div>
      <h1 className="ob-word" aria-label={WORD}>
        {WORD.split('').map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.5 + i * 0.06, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            {ch === ' ' ? ' ' : ch}
          </motion.span>
        ))}
      </h1>
      <motion.p className="ob-tagline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 1 }}>
        365 days a year. Light up every one of them.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.1, duration: 0.6 }}>
        <button className="btn btn-primary btn-lg" onClick={onNext} autoFocus>
          Begin
        </button>
      </motion.div>
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState('');
  const [northStar, setNorthStar] = useState('');
  const [why, setWhy] = useState('');
  const [habits, setHabits] = useState([]);
  const [custom, setCustom] = useState('');
  const [wake, setWake] = useState('07:00');
  const [reflect, setReflect] = useState('21:30');
  const [notifications, setNotifications] = useState(true);

  const now = new Date();
  const go = (n) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    sound.tick();
  };

  const toggleHabit = (h) => setHabits((list) => (list.some((x) => x.name === h.name) ? list.filter((x) => x.name !== h.name) : [...list, h]));

  const addCustom = () => {
    const n = custom.trim();
    if (!n || habits.some((h) => h.name === n)) return;
    setHabits((list) => [...list, { name: n, icon: 'sparkles' }]);
    setCustom('');
  };

  const finish = (e) => {
    sound.lightUp();
    celebrate(e, 2.4);
    setTimeout(() => {
      completeOnboarding({ name, northStar, why, habits, wake, reflect, notifications });
      setDayLit(todayKey(), true);
    }, 600);
  };

  const steps = [
    null,
    {
      title: 'First, what should we call you?',
      body: (
        <input
          className="ob-input"
          autoFocus
          value={name}
          maxLength={40}
          placeholder="Your name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && go(2)}
          aria-label="Your name"
        />
      ),
      valid: name.trim().length > 0,
    },
    {
      title: `${name.trim() || 'So'}, what's the one goal that would change everything this year?`,
      body: (
        <div className="ob-stack">
          <input
            className="ob-input"
            autoFocus
            value={northStar}
            maxLength={120}
            placeholder="Launch my own business"
            onChange={(e) => setNorthStar(e.target.value)}
            aria-label="Your main goal"
          />
          <textarea className="textarea ob-why" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Why it matters to you. You'll see this on the hard days." aria-label="Why it matters" />
          <p className="faint">This becomes your North Star. You can add more goals later.</p>
        </div>
      ),
      valid: northStar.trim().length > 0,
    },
    {
      title: 'Pick a few daily habits to start with.',
      body: (
        <div className="ob-stack">
          <div className="ob-habits">
            {[...HABIT_SUGGESTIONS, ...habits.filter((h) => !HABIT_SUGGESTIONS.some((s) => s.name === h.name))].map((h) => {
              const Icon = habitIcon(h.icon);
              const on = habits.some((x) => x.name === h.name);
              return (
                <button key={h.name} className="chip ob-chip" aria-pressed={on} onClick={() => toggleHabit(h)}>
                  <Icon /> {h.name}
                </button>
              );
            })}
          </div>
          <div className="ob-custom">
            <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} placeholder="Or write your own" aria-label="Custom habit" />
            <button className="btn" onClick={addCustom} disabled={!custom.trim()}>
              <Plus /> Add
            </button>
          </div>
          <p className="faint">{habits.length ? `${habits.length} selected. Three is a strong start.` : 'Three is a strong start. You can skip this too.'}</p>
        </div>
      ),
      valid: true,
    },
    {
      title: 'Set your daily rhythm.',
      body: (
        <div className="ob-stack">
          <div className="grid-2">
            <label className="field">
              <span>Morning briefing</span>
              <input className="input" type="time" value={wake} onChange={(e) => setWake(e.target.value)} />
            </label>
            <label className="field">
              <span>Evening reflection</span>
              <input className="input" type="time" value={reflect} onChange={(e) => setReflect(e.target.value)} />
            </label>
          </div>
          <div className="toggle-row">
            <div>
              <strong>Windows notifications</strong>
              <p className="muted">Morning briefings, habit reminders, upcoming tasks and streak alerts.</p>
            </div>
            <Switch checked={notifications} onChange={setNotifications} label="Windows notifications" />
          </div>
          {notifications && (
            <button className="btn btn-sm ob-test" onClick={() => systemNotify({ title: 'Notifications are on', body: "This is how Beyond Human will keep you on track." })}>
              <Bell /> Send a test notification
            </button>
          )}
        </div>
      ),
      valid: true,
    },
    {
      title: `Day ${dayOfYear(now)} of ${daysInYear(now.getFullYear())}.`,
      body: (
        <div className="ob-stack ob-final">
          <p className="ob-lead">
            {daysInYear(now.getFullYear()) - dayOfYear(now)} days are left this year. Each one you show up for becomes a star in your orbit. Today is the first.
          </p>
          <button className="btn btn-primary btn-lg" onClick={finish}>
            Light up day one
          </button>
        </div>
      ),
      valid: true,
      final: true,
    },
  ];

  const current = steps[step];

  return (
    <div className="onboarding">
      <AnimatePresence mode="wait" custom={dir}>
        <motion.section
          key={step}
          className="ob-step"
          custom={dir}
          initial={{ opacity: 0, x: 40 * dir }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 * dir }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 0 ? (
            <Intro onNext={() => go(1)} />
          ) : (
            <div className="ob-card">
              <h2 className="ob-title">{current.title}</h2>
              {current.body}
              {!current.final && (
                <div className="ob-nav">
                  <button className="btn btn-ghost" onClick={() => go(step - 1)}>
                    <ChevronLeft /> Back
                  </button>
                  <button className="btn btn-primary" onClick={() => go(step + 1)} disabled={!current.valid}>
                    {step === 3 && !habits.length ? 'Skip for now' : 'Continue'}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      {step > 0 && (
        <ol className="ob-progress" aria-label={`Step ${step} of 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i} className={i <= step ? 'on' : ''} />
          ))}
        </ol>
      )}
    </div>
  );
}
