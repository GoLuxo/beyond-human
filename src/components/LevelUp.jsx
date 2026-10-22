import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { on, emit } from '../lib/events.js';

export default function LevelUp() {
  const [data, setData] = useState(null);

  useEffect(
    () =>
      on('levelup', (d) => {
        setData(d);
        emit('celebrate', { x: window.innerWidth / 2, y: window.innerHeight / 2, intensity: 2.2 });
      }),
    [],
  );

  useEffect(() => {
    if (!data) return undefined;
    const onKey = (e) => (e.key === 'Escape' || e.key === 'Enter') && setData(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data]);

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          className="levelup"
          role="dialog"
          aria-modal="true"
          aria-label={`Level ${data.level}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setData(null)}
        >
          <div className="levelup-orbits" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="levelup-orbit"
                style={{ width: 260 + i * 150, height: 260 + i * 150 }}
                initial={{ scale: 0.4, opacity: 0, rotate: 0 }}
                animate={{ scale: 1, opacity: 1, rotate: 360 }}
                transition={{
                  scale: { delay: i * 0.12, duration: 0.9, ease: [0.16, 1, 0.3, 1] },
                  opacity: { delay: i * 0.12, duration: 0.6 },
                  rotate: { duration: 18 + i * 8, repeat: Infinity, ease: 'linear' },
                }}
              >
                <i />
              </motion.span>
            ))}
          </div>
          <motion.div
            className="levelup-card"
            initial={{ scale: 0.7, opacity: 0, filter: 'blur(12px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 20 }}
          >
            <p className="muted">{data.rankUp ? 'New rank reached' : 'Level up'}</p>
            <h2 className="levelup-level num">{data.level}</h2>
            <h3 className="display">{data.rank.name}</h3>
            <p className="levelup-line">{data.rank.line}</p>
            <button className="btn btn-primary btn-lg" onClick={() => setData(null)}>
              Keep going
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
