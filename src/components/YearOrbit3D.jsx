import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { gfx, useGfx, onFrame } from '../gfx/engine.js';
import OrbitDial from './OrbitDial.jsx';
import { yearDays, monthName, parseYmd } from '../lib/dates.js';

const REST = { dist: 50, elev: 57, azim: 0 };

function dayStyle(key, { days, today, startKey, scoreOf }) {
  const lit = Boolean(days[key]?.done);
  if (key === today) return lit ? { size: 0.78, brightness: 3, flare: 1, pulse: 1 } : { size: 0.42, brightness: 1, flare: 0.3, pulse: 1 };
  const future = key > today || (key < startKey && !lit);
  if (future) return { size: 0.1, brightness: 0.22, flare: 0, pulse: 0 };
  const s = scoreOf(key);
  if (lit) return { size: 0.3 + s * 0.08, brightness: 1.5 + s * 0.8, flare: 0.35, pulse: 0 };
  return { size: 0.13 + s * 0.12, brightness: 0.3 + s * 0.5, flare: 0, pulse: 0 };
}

export default function YearOrbit3D({ year, today, startKey = '', days, scoreOf, hoverKey, onHover, onSelect, intro = false, reduced = false, children }) {
  const { state } = useGfx();
  const slotRef = useRef(null);
  const labelRefs = useRef([]);
  const lastPick = useRef(-2);
  const prevLit = useRef(null);
  const keys = useMemo(() => yearDays(year), [year]);
  const monthStarts = useMemo(() => Array.from({ length: 12 }, (_, m) => keys.findIndex((k) => parseYmd(k).getMonth() === m)), [keys]);
  const styles = useMemo(() => keys.map((k) => dayStyle(k, { days, today, startKey, scoreOf })), [keys, days, today, startKey, scoreOf]);

  useEffect(() => {
    const ti = keys.indexOf(today);
    const elapsed = ti >= 0 ? (ti + 1) / keys.length : today > keys[keys.length - 1] ? 1 : 0;
    gfx.orbit.setDays(styles, ti, elapsed, monthStarts);
  }, [styles, keys, today, monthStarts]);

  useLayoutEffect(() => {
    const el = slotRef.current;
    if (!el) return undefined;
    gfx.orbit.attach(el);
    return () => gfx.orbit.detach(el);
  }, [state]);

  useEffect(() => {
    if (state !== 'running') return undefined;
    const rig = gfx.orbit.rig;
    const reveal = gfx.orbit.reveal;
    if (!rig || !reveal) return undefined;
    if (!intro || reduced) {
      Object.assign(rig, REST);
      reveal.value = 1;
      return undefined;
    }
    Object.assign(rig, { dist: 140, elev: 89, azim: -130 });
    reveal.value = 0;
    const tl = gsap.timeline();
    tl.to(rig, { ...REST, duration: 3.4, ease: 'expo.inOut' }, 0).to(reveal, { value: 1, duration: 2.6, ease: 'power2.inOut' }, 0.6);
    return () => {
      tl.kill();
      Object.assign(rig, REST);
      reveal.value = 1;
    };
  }, [state, intro, reduced]);

  useEffect(() => {
    if (state !== 'running') return undefined;
    return onFrame((canvasRect) => {
      const slot = slotRef.current;
      if (!slot) return;
      const r = slot.getBoundingClientRect();
      const fade = gfx.orbit.reveal?.value ?? 1;
      monthStarts.forEach((dayIndex, m) => {
        const el = labelRefs.current[m];
        const p = gfx.orbit.projectLabel(dayIndex, canvasRect);
        if (!el || !p) return;
        el.style.transform = `translate(${(p.x - r.left).toFixed(1)}px, ${(p.y - r.top).toFixed(1)}px) translate(-50%, -50%)`;
        el.style.opacity = String(fade);
      });
    });
  }, [state, monthStarts]);

  useEffect(() => {
    gfx.orbit.setHover(hoverKey ? keys.indexOf(hoverKey) : -1);
  }, [hoverKey, keys]);

  useEffect(() => {
    const litNow = new Set(keys.filter((k) => days[k]?.done));
    if (prevLit.current) {
      const fresh = keys.filter((k) => litNow.has(k) && !prevLit.current.has(k));
      if (fresh.length) gfx.orbit.ignite(keys.indexOf(fresh.includes(today) ? today : fresh[0]));
    }
    prevLit.current = litNow;
  }, [days, keys, today]);

  if (state === 'failed') {
    return (
      <OrbitDial year={year} today={today} startKey={startKey} days={days} scoreOf={scoreOf} onHover={onHover} onSelect={onSelect} animate={intro}>
        {children}
      </OrbitDial>
    );
  }

  const pickAt = (e) => gfx.orbit.pick(e.clientX, e.clientY);

  return (
    <div
      ref={slotRef}
      className="orbit3d"
      onPointerMove={(e) => {
        const i = pickAt(e);
        e.currentTarget.style.cursor = i >= 0 ? 'pointer' : '';
        if (i !== lastPick.current) {
          lastPick.current = i;
          onHover?.(i >= 0 ? keys[i] : null);
        }
      }}
      onPointerLeave={() => {
        lastPick.current = -2;
        onHover?.(null);
      }}
      onClick={(e) => {
        if (e.target.closest('.orbit3d-center button')) return;
        const i = pickAt(e);
        if (i >= 0) onSelect?.(keys[i]);
      }}
      role="img"
      aria-label={`${keys.filter((k) => days[k]?.done).length} of ${keys.length} days lit in ${year}`}
    >
      {monthStarts.map((_, m) => (
        <span key={m} ref={(el) => (labelRefs.current[m] = el)} className="orbit3d-label" aria-hidden="true">
          {monthName(m)}
        </span>
      ))}
      <div className="orbit3d-center">{children}</div>
    </div>
  );
}
