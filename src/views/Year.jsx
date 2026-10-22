import { useState } from 'react';
import { Share2, ChevronLeft, ChevronRight, Grid3x3, Orbit as OrbitIcon, Flame, Trophy, Hourglass, Sparkles } from 'lucide-react';
import { useAppState } from '../state/store.js';
import YearOrbit3D from '../components/YearOrbit3D.jsx';
import MonthsGrid from '../components/MonthsGrid.jsx';
import DayDrawer from '../components/DayDrawer.jsx';
import { useApp } from '../AppContext.js';
import { Segmented } from '../components/ui.jsx';
import { scorer, computeStats } from '../lib/progress.js';
import { todayKey, daysInYear, ymd, dayOfYear, formatLong, parseYmd, diffDays } from '../lib/dates.js';

export default function Year() {
  const state = useAppState();
  const { openShare } = useApp();
  const stats = computeStats(state);
  const today = todayKey();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [mode, setMode] = useState('months');
  const [selected, setSelected] = useState(null);
  const [hover, setHover] = useState(null);
  const scoreOf = scorer(state);

  const total = daysInYear(year);
  const prefix = `${year}-`;
  const lit = Object.keys(state.days).filter((k) => k.startsWith(prefix) && state.days[k]?.done).length;
  const elapsed = year < thisYear ? total : year > thisYear ? 0 : dayOfYear(new Date());
  const left = total - elapsed;
  const joined = ymd(new Date(state.profile.createdAt));
  const firstTracked = joined > `${year}-01-01` ? joined : `${year}-01-01`;
  const lastTracked = year < thisYear ? `${year}-12-31` : today;
  const tracked = firstTracked > lastTracked ? 0 : diffDays(firstTracked, lastTracked) + 1;


  return (
    <div className="year">
      <header className="page-head">
        <div>
          <h1>Your {year}</h1>
          <p>
            {lit} of {total} days lit{tracked ? `, ${Math.min(100, Math.round((lit / tracked) * 100))}% of the ${tracked} days since you started` : ''}. Click any day to light it up, log your mood or leave a note.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={openShare}>
            <Share2 /> Share
          </button>
          <Segmented
            label="View"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'months', label: 'Months', icon: Grid3x3 },
              { value: 'orbit', label: 'Orbit', icon: OrbitIcon },
            ]}
          />
          <button className="icon-btn" onClick={() => setYear(year - 1)} aria-label="Previous year">
            <ChevronLeft />
          </button>
          <span className="num year-num">{year}</span>
          <button className="icon-btn" onClick={() => setYear(year + 1)} aria-label="Next year">
            <ChevronRight />
          </button>
        </div>
      </header>

      <div className="year-stats">
        <div>
          <Sparkles />
          <span className="num">{lit}</span>
          <span className="muted">days lit</span>
        </div>
        <div>
          <Flame />
          <span className="num">{stats.streak}</span>
          <span className="muted">current streak</span>
        </div>
        <div>
          <Trophy />
          <span className="num">{stats.bestStreak}</span>
          <span className="muted">best streak</span>
        </div>
        <div>
          <Hourglass />
          <span className="num">{left}</span>
          <span className="muted">days left</span>
        </div>
      </div>

      {mode === 'months' ? (
        <section className="panel months" aria-label={`Days of ${year}`}>
          <MonthsGrid year={year} days={state.days} scoreOf={scoreOf} today={today} joined={joined} hoverKey={hover} onHover={setHover} onSelect={setSelected} />
          <div className="legend">
            <span>
              <i className="cell lit">
                <i />
              </i>
              Lit
            </span>
            <span>
              <i className="cell" style={{ '--s': 0.9 }}>
                <i />
              </i>
              Busy but not lit
            </span>
            <span>
              <i className="cell" style={{ '--s': 0.2 }}>
                <i />
              </i>
              Missed
            </span>
            <span>
              <i className="cell future">
                <i />
              </i>
              Upcoming or before you started
            </span>
          </div>
        </section>
      ) : (
        <section className="year-orbit">
          <YearOrbit3D year={year} today={today} startKey={joined} days={state.days} scoreOf={scoreOf} hoverKey={hover} onHover={setHover} onSelect={setSelected} reduced={state.settings.reduceMotion}>
            <div className="orbit-readout">
              {hover ? (
                <>
                  <span className="orbit-day num">{dayOfYear(parseYmd(hover))}</span>
                  <span className="orbit-date">{formatLong(hover)}</span>
                  <span className="muted">{hover > today ? 'Upcoming' : state.days[hover]?.done ? 'Lit' : 'Not lit'}</span>
                </>
              ) : (
                <>
                  <span className="orbit-day num lit">{lit}</span>
                  <span className="orbit-date">days lit in {year}</span>
                </>
              )}
            </div>
          </YearOrbit3D>
        </section>
      )}

      <DayDrawer dayKey={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
