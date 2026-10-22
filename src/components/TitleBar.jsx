import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Search, Timer } from 'lucide-react';
import Logo from './Logo.jsx';
import { win, isDesktop } from '../lib/platform.js';
import { useFocusTimer } from '../lib/focusTimer.js';
import { emit } from '../lib/events.js';
import { useGfx } from '../gfx/engine.js';

export const formatClock = (ms) => {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

function FpsChip() {
  const { fps, backend, state } = useGfx();
  if (state !== 'running') return null;
  return (
    <span className="tb-fps" title="Frames per second and graphics backend">
      <span className="num">{fps}</span> fps, {backend}
    </span>
  );
}

export default function TitleBar({ onSearch, showFps }) {
  const [maximized, setMaximized] = useState(false);
  const t = useFocusTimer();

  useEffect(() => {
    win.isMaximized().then(setMaximized);
    return win.onState((s) => setMaximized(s.maximized));
  }, []);

  const timerVisible = t.status !== 'idle';

  return (
    <header className="titlebar" onDoubleClick={(e) => e.target === e.currentTarget && win.toggleMaximize()}>
      <div className="tb-brand">
        <Logo size={18} />
        <span>Beyond Human</span>
      </div>

      {onSearch ? (
        <button className="tb-search" onClick={onSearch}>
          <Search />
          <span>Search or jump to</span>
          <span className="tb-keys">
            <kbd className="kbd">Ctrl</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </button>
      ) : (
        <span />
      )}

      <div className="tb-right">
        {showFps && <FpsChip />}
        {timerVisible && (
          <button className={`tb-timer${t.status === 'paused' ? ' paused' : ''}`} onClick={() => emit('navigate', 'focus')}>
            <Timer />
            <span className="num">{formatClock(t.remaining)}</span>
            <span className="tb-timer-mode">{t.mode === 'focus' ? 'Focus' : 'Break'}</span>
          </button>
        )}
        {isDesktop && (
          <div className="tb-controls">
            <button onClick={win.minimize} aria-label="Minimize">
              <Minus />
            </button>
            <button onClick={win.toggleMaximize} aria-label={maximized ? 'Restore' : 'Maximize'}>
              {maximized ? <Copy /> : <Square />}
            </button>
            <button className="tb-close" onClick={win.close} aria-label="Close">
              <X />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
