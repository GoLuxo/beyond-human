import { useEffect, useRef } from 'react';
import { startGfx, gfx, useGfx } from '../gfx/engine.js';
import Starfield from './Starfield.jsx';

export default function GpuBackdrop({ theme, quality, reduced }) {
  const ref = useRef(null);
  const { state } = useGfx();

  useEffect(() => {
    startGfx(ref.current, { theme, quality, reduced, safe: window.__beyond?.safeGraphics });
  }, []);

  useEffect(() => {
    gfx.setOptions({ theme, quality, reduced });
  }, [theme, quality, reduced]);

  return (
    <>
      <canvas ref={ref} className={`gpu-canvas${state === 'running' ? ' on' : ''}`} aria-hidden="true" />
      {state === 'failed' && <Starfield theme={theme} reduced={reduced} />}
    </>
  );
}
