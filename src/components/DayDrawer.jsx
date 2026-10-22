import { CloudLightning, Cloud, CloudSun, Sun, Sparkles, Check, X, Timer, ListChecks, Repeat, NotebookPen } from 'lucide-react';
import { Drawer, InlineEdit } from './ui.jsx';
import { useAppState } from '../state/store.js';
import { setDayMood, setDayNote } from '../state/actions.js';
import { formatFull, dayOfYear, parseYmd, todayKey, relativeDays } from '../lib/dates.js';
import { habitScheduled } from '../lib/progress.js';
import { toggleLit } from '../lib/rituals.js';
import { useApp, setPendingDate } from '../AppContext.js';

export const MOODS = [
  { value: 1, label: 'Stormy', icon: CloudLightning },
  { value: 2, label: 'Cloudy', icon: Cloud },
  { value: 3, label: 'Clear', icon: CloudSun },
  { value: 4, label: 'Bright', icon: Sun },
  { value: 5, label: 'Radiant', icon: Sparkles },
];

export function MoodPicker({ value, onChange }) {
  return (
    <div className="mood-picker" role="radiogroup" aria-label="Mood">
      {MOODS.map((m) => {
        const Icon = m.icon;
        return (
          <button key={m.value} role="radio" aria-checked={value === m.value} className="mood" onClick={() => onChange(m.value)}>
            <Icon />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function DayDrawer({ dayKey, onClose }) {
  const state = useAppState();
  const { navigate } = useApp();
  const open = Boolean(dayKey);
  const key = dayKey ?? todayKey();
  const day = state.days[key] ?? {};
  const future = key > todayKey();
  const tasks = state.tasks.filter((t) => t.date === key);
  const habits = state.habits.filter((h) => !h.archived && habitScheduled(h, key));
  const focus = state.focus.filter((f) => f.date === key).reduce((n, f) => n + f.minutes, 0);
  const journal = state.journal[key];

  return (
    <Drawer open={open} onClose={onClose} label={formatFull(key)}>
      <div className="day-drawer">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">
            Day {dayOfYear(parseYmd(key))}, {relativeDays(key)}
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <h2 className="display day-title">{formatFull(key)}</h2>

        <button className={`lit-toggle${day.done ? ' on' : ''}`} disabled={future} onClick={(e) => toggleLit(key, e)}>
          <span className="lit-orb">{day.done ? <Check /> : <Sparkles />}</span>
          <span>
            <strong>{future ? 'Not here yet' : day.done ? 'This day is lit' : 'Light up this day'}</strong>
            <span className="muted">{future ? 'You can light it up when it arrives.' : day.done ? 'Click to undo.' : 'Mark it as a day you showed up.'}</span>
          </span>
        </button>

        {!future && (
          <>
            <h4 className="drawer-label">Mood</h4>
            <MoodPicker value={day.mood} onChange={(m) => setDayMood(key, m)} />

            <h4 className="drawer-label">Note</h4>
            <InlineEdit className="textarea" multiline value={day.note} onSave={(v) => setDayNote(key, v)} placeholder="What made this day count?" ariaLabel="Day note" />
          </>
        )}

        <h4 className="drawer-label">Summary</h4>
        <ul className="day-summary">
          <li>
            <ListChecks />
            <span>Tasks</span>
            <strong>
              {tasks.filter((t) => t.done).length} / {tasks.length}
            </strong>
          </li>
          <li>
            <Repeat />
            <span>Habits</span>
            <strong>
              {habits.filter((h) => h.log?.[key]).length} / {habits.length}
            </strong>
          </li>
          <li>
            <Timer />
            <span>Focus</span>
            <strong>{focus} min</strong>
          </li>
          <li>
            <NotebookPen />
            <span>Journal</span>
            <strong>{journal ? 'Written' : 'Empty'}</strong>
          </li>
        </ul>
        <div className="row" style={{ marginTop: 18 }}>
          <button
            className="btn btn-sm"
            onClick={() => {
              onClose();
              setPendingDate(key);
              navigate('planner');
            }}
          >
            Open planner
          </button>
          {!future && (
            <button
              className="btn btn-sm"
              onClick={() => {
                onClose();
                setPendingDate(key);
                navigate('journal');
              }}
            >
              Open journal
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
}
