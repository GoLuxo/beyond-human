import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkle } from 'lucide-react';
import { on } from '../lib/events.js';

let seq = 0;

export default function Toasts() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const push = (item, ttl) => {
      const id = ++seq;
      setItems((list) => [...list.slice(-3), { ...item, id }]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), ttl);
    };
    const offToast = on('toast', (t) => push({ kind: 'toast', ...t }, t.action ? 5000 : 3200));
    const offAch = on('achievement', (a) => push({ kind: 'achievement', achievement: a }, 5500));
    return () => {
      offToast();
      offAch();
    };
  }, []);

  const dismiss = (id) => setItems((list) => list.filter((x) => x.id !== id));

  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => {
          if (t.kind === 'achievement') {
            const Icon = t.achievement.icon;
            return (
              <motion.div
                key={t.id}
                layout
                className="toast achievement"
                initial={{ opacity: 0, x: 60, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              >
                <span className="badge-icon">
                  <Icon />
                </span>
                <span>
                  <span className="muted">Achievement unlocked</span>
                  <strong>{t.achievement.title}</strong>
                  <span className="muted">{t.achievement.desc}</span>
                </span>
              </motion.div>
            );
          }
          const Icon = t.icon ?? Sparkle;
          return (
            <motion.div
              key={t.id}
              layout
              className="toast"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <Icon />
              <span>{t.message}</span>
              {t.action && (
                <button
                  className="toast-action"
                  onClick={() => {
                    t.action.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
