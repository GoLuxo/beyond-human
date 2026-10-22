import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Sparkles, Play, SunMoon, Target, Repeat, CornerDownLeft, Share2 } from 'lucide-react';
import { NAV } from './Sidebar.jsx';

export default function CommandPalette({ open, onClose, run }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);

  const commands = useMemo(
    () => [
      { id: 'new-task', label: 'Add a task', hint: 'Ctrl N', icon: Plus },
      { id: 'checkin', label: 'Light up today', icon: Sparkles },
      { id: 'focus-start', label: 'Start a focus session', icon: Play },
      { id: 'new-habit', label: 'Create a habit', icon: Repeat },
      { id: 'new-goal', label: 'Set a new goal', icon: Target },
      { id: 'share', label: 'Share your year', icon: Share2 },
      { id: 'toggle-theme', label: 'Switch between dark and light', icon: SunMoon },
      ...NAV.map((n, i) => ({ id: `go:${n.id}`, label: `Go to ${n.label}`, hint: i < 9 ? `Ctrl ${i + 1}` : undefined, icon: n.icon })),
    ],
    [],
  );

  const q = query.trim().toLowerCase();
  const results = q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;
  const quickAdd = q.length > 1 && !results.length;

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  const choose = (cmd) => {
    onClose();
    run(cmd.id, query.trim());
  };

  const onKey = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (quickAdd) choose({ id: 'quick-task' });
      else if (results[index]) choose(results[index]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="scrim palette-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          >
            <div className="palette-input">
              <Search />
              <input
                ref={inputRef}
                className="input-bare"
                placeholder="Type a command, or a task to add"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                aria-label="Command"
              />
            </div>
            <ul className="palette-list" role="listbox">
              {quickAdd && (
                <li>
                  <button className="palette-item active" onClick={() => choose({ id: 'quick-task' })}>
                    <Plus />
                    <span>Add "{query.trim()}" to today</span>
                    <CornerDownLeft className="palette-enter" />
                  </button>
                </li>
              )}
              {results.map((c, i) => {
                const Icon = c.icon;
                return (
                  <li key={c.id}>
                    <button className={`palette-item${i === index ? ' active' : ''}`} onMouseEnter={() => setIndex(i)} onClick={() => choose(c)} role="option" aria-selected={i === index}>
                      <Icon />
                      <span>{c.label}</span>
                      {c.hint && <span className="palette-hint">{c.hint}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
