import { useLayoutEffect, useRef, useState } from 'react';

function useWidth(fallback = 600) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}


export function BarChart({ data, height = 200, format = (v) => v, max: maxProp }) {
  const [hover, setHover] = useState(null);
  const [ref, W] = useWidth();
  const pad = { t: 16, r: 8, b: 26, l: 8 };
  const max = Math.max(maxProp ?? 0, ...data.map((d) => d.value), 1);
  const slot = (W - pad.l - pad.r) / data.length;
  const bw = Math.max(4, Math.min(28, slot - 6));
  const ih = height - pad.t - pad.b;
  const y = (v) => pad.t + ih - (v / max) * ih;

  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(', ')}>
        {[0.5, 1].map((g) => (
          <line key={g} x1={pad.l} x2={W - pad.r} y1={y(max * g)} y2={y(max * g)} className="chart-grid" />
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} className="chart-axis" />
        {data.map((d, i) => {
          const x = pad.l + slot * i + (slot - bw) / 2;
          const h = Math.max(d.value > 0 ? 3 : 0, y(0) - y(d.value));
          const r = Math.min(4, bw / 2, h);
          const top = y(0) - h;
          return (
            <g key={d.key ?? i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={ih + pad.b} fill="transparent" />
              {h > 0 && (
                <path
                  className={`chart-bar${hover === i ? ' hot' : ''}${d.highlight ? ' highlight' : ''}`}
                  d={`M${x},${y(0)} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${y(0)} Z`}
                />
              )}
              {(data.length <= 14 || i % 2 === 0) && (
                <text x={x + bw / 2} y={height - 8} textAnchor="middle" className="chart-label">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((pad.l + slot * hover + slot / 2) / W) * 100}%`, top: `${(y(data[hover].value) / height) * 100}%` }}>
          <strong>{format(data[hover].value)}</strong>
          <span>{data[hover].full ?? data[hover].label}</span>
        </div>
      )}
    </div>
  );
}

export function LineChart({ data, height = 200, max = 1, format = (v) => v, area = true, yTicks = [] }) {
  const [hover, setHover] = useState(null);
  const [ref, W] = useWidth();
  const pad = { t: 14, r: 10, b: 26, l: 10 };
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const x = (i) => pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v) => pad.t + ih - (v / max) * ih;

  const segments = [];
  let seg = [];
  data.forEach((d, i) => {
    if (d.value == null) {
      if (seg.length) segments.push(seg);
      seg = [];
    } else seg.push([x(i), y(d.value)]);
  });
  if (seg.length) segments.push(seg);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.l) / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  const h = hover !== null ? data[hover] : null;

  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`${data.filter((d) => d.value != null).length} data points`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {yTicks.map((t) => (
          <line key={t} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="chart-grid" />
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} className="chart-axis" />
        {area &&
          segments
            .filter((s) => s.length > 1)
            .map((s, i) => <path key={`a${i}`} className="chart-area" d={`M${s[0][0]},${y(0)} ${s.map((p) => `L${p[0]},${p[1]}`).join(' ')} L${s[s.length - 1][0]},${y(0)} Z`} />)}
        {segments.map((s, i) =>
          s.length > 1 ? (
            <path key={`l${i}`} className="chart-line" d={s.map((p, j) => `${j ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')} />
          ) : (
            <circle key={`p${i}`} cx={s[0][0]} cy={s[0][1]} r="3" className="chart-point" />
          ),
        )}
        {data.map((d, i) =>
          i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
            <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="chart-label">
              {d.label}
            </text>
          ) : null,
        )}
        {h && (
          <g className="chart-cross">
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} />
            {h.value != null && <circle cx={x(hover)} cy={y(h.value)} r="5" />}
          </g>
        )}
      </svg>
      {h && (
        <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${((h.value != null ? y(h.value) : y(0)) / height) * 100}%` }}>
          <strong>{h.value != null ? format(h.value) : 'No entry'}</strong>
          <span>{h.full ?? h.label}</span>
        </div>
      )}
    </div>
  );
}
