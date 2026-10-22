import { memo } from 'react';
import { daysInMonth, monthName, ymd, formatLong } from '../lib/dates.js';

function MonthsGrid({ year, days, scoreOf, today, joined, hoverKey, onHover, onSelect, compact = false, animate = true }) {
  let index = 0;
  return (
    <div className={`months-grid${compact ? ' compact' : ''}${animate ? ' intro' : ''}`} onMouseLeave={() => onHover?.(null)}>
      <div className="months-head" aria-hidden="true">
        <span />
        {Array.from({ length: 31 }, (_, d) => (
          <span key={d}>{compact ? ((d + 1) % 5 === 0 || d === 0 ? d + 1 : '') : d + 1}</span>
        ))}
      </div>
      {Array.from({ length: 12 }, (_, m) => (
        <div key={m} className="month-row">
          <span className="month-label">{monthName(m)}</span>
          {Array.from({ length: 31 }, (_, d) => {
            if (d >= daysInMonth(year, m)) return <span key={d} className="cell-none" />;
            const key = ymd(new Date(year, m, d + 1));
            const isLit = Boolean(days[key]?.done);
            const future = key > today || (key < joined && !isLit);
            const score = future ? 0 : scoreOf(key);
            const i = index++;
            const cls = ['cell', isLit && 'lit', future && 'future', key === today && 'today', key === hoverKey && 'hover'].filter(Boolean).join(' ');
            return (
              <button
                key={d}
                className={cls}
                style={{ '--i': i, '--s': 0.2 + score * 0.8 }}
                onMouseEnter={() => onHover?.(key)}
                onFocus={() => onHover?.(key)}
                onClick={() => onSelect?.(key)}
                aria-label={`${formatLong(key)}${isLit ? ', lit' : ''}`}
              >
                <i />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default memo(MonthsGrid);
