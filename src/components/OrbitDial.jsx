import { memo, useMemo, useRef } from 'react';
import { yearDays, monthName, parseYmd } from '../lib/dates.js';

const SIZE = 640;
const C = SIZE / 2;
const R_IN = 246;
const R_OUT = 264;

const polar = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};

function OrbitDial({ year, today, startKey = '', days, scoreOf, onHover, onSelect, children, animate = true }) {
  const keys = useMemo(() => yearDays(year), [year]);
  const n = keys.length;
  const svgRef = useRef(null);
  const angleOf = (i) => -90 + ((i + 0.5) * 360) / n;
  const todayIndex = keys.indexOf(today);

  const ticks = useMemo(
    () =>
      keys.map((key, i) => {
        const lit = Boolean(days[key]?.done);
        const future = key > today || (key < startKey && !lit);
        const score = future ? 0 : scoreOf(key);
        const deg = angleOf(i);
        const [x1, y1] = polar(lit ? R_IN - 10 : R_IN, deg);
        const [x2, y2] = polar(lit ? R_OUT + 6 : R_OUT, deg);
        return { key, i, lit, future, score, x1, y1, x2, y2 };
      }),
    [keys, days, today, startKey, scoreOf],
  );

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) => {
        const idx = keys.findIndex((k) => parseYmd(k).getMonth() === m);
        const [x, y] = polar(R_OUT + 30, angleOf(idx + 2));
        const [sx1, sy1] = polar(R_OUT + 12, angleOf(idx) - 180 / n);
        const [sx2, sy2] = polar(R_OUT + 18, angleOf(idx) - 180 / n);
        return { m, x, y, sx1, sy1, sx2, sy2 };
      }),
    [keys],
  );

  const elapsed = todayIndex >= 0 ? (todayIndex + 1) / n : today > keys[n - 1] ? 1 : 0;
  const progressR = R_IN - 34;
  const circ = 2 * Math.PI * progressR;
  const [sx, sy] = todayIndex >= 0 ? polar(R_OUT + 16, angleOf(todayIndex)) : [null, null];

  const indexFromEvent = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const scale = SIZE / rect.width;
    const x = (e.clientX - rect.left) * scale - C;
    const y = (e.clientY - rect.top) * scale - C;
    const dist = Math.hypot(x, y);
    if (dist < R_IN - 24 || dist > R_OUT + 26) return -1;
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    return Math.min(n - 1, Math.floor((deg / 360) * n));
  };

  return (
    <div className={`orbit${animate ? ' orbit-intro' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="orbit-svg"
        role="img"
        aria-label={`${ticks.filter((t) => t.lit).length} of ${n} days lit in ${year}`}
        onMouseMove={(e) => {
          const i = indexFromEvent(e);
          onHover?.(i >= 0 ? keys[i] : null);
        }}
        onMouseLeave={() => onHover?.(null)}
        onClick={(e) => {
          const i = indexFromEvent(e);
          if (i >= 0) onSelect?.(keys[i]);
        }}
      >
        <defs>
          <filter id="orbit-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="orbit-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--fg)" stopOpacity="0.07" />
            <stop offset="100%" stopColor="var(--fg)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={C} cy={C} r={R_IN - 40} fill="url(#orbit-core)" />
        <circle cx={C} cy={C} r={progressR} fill="none" stroke="var(--track)" strokeWidth="1" />
        <circle
          className="orbit-progress"
          cx={C}
          cy={C}
          r={progressR}
          fill="none"
          stroke="var(--fg)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={`${circ * elapsed} ${circ}`}
          transform={`rotate(-90 ${C} ${C})`}
        />

        <g className="orbit-months">
          {months.map((m) => (
            <g key={m.m}>
              <line x1={m.sx1} y1={m.sy1} x2={m.sx2} y2={m.sy2} />
              <text x={m.x} y={m.y} textAnchor="middle" dominantBaseline="middle">
                {monthName(m.m)}
              </text>
            </g>
          ))}
        </g>

        <g className="orbit-ticks">
          {ticks
            .filter((t) => !t.lit)
            .map((t) => (
              <line
                key={t.key}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                className={t.future ? 'tick future' : 'tick'}
                style={{ '--i': t.i, strokeOpacity: t.future ? undefined : 0.22 + t.score * 0.6 }}
              />
            ))}
        </g>
        <g className="orbit-ticks lit" filter="url(#orbit-glow)">
          {ticks
            .filter((t) => t.lit)
            .map((t) => (
              <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className="tick lit" style={{ '--i': t.i }} />
            ))}
        </g>

        {sx !== null && (
          <g className="orbit-satellite">
            <circle cx={sx} cy={sy} r="11" className="sat-pulse" />
            <circle cx={sx} cy={sy} r="5" className="sat-core" filter="url(#orbit-glow)" />
          </g>
        )}
      </svg>
      <div className="orbit-center">{children}</div>
    </div>
  );
}

export default memo(OrbitDial);
