import { useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Trophy, Lightbulb, Sunrise, NotebookPen, PenLine } from 'lucide-react';
import { useAppState } from '../state/store.js';
import { setJournal, setDayMood } from '../state/actions.js';
import { takePendingDate } from '../AppContext.js';
import { InlineEdit } from '../components/ui.jsx';
import { MoodPicker, MOODS } from '../components/DayDrawer.jsx';
import { todayKey, addDays, formatFull, formatShort, formatWeekday, relativeDays, dayOfYear, parseYmd } from '../lib/dates.js';
import { journalHasContent } from '../lib/progress.js';

const PROMPTS = [
  'What would the person you want to become do tomorrow?',
  'What did you avoid today, and why?',
  'Where did you feel most alive today?',
  'What is one thing you would do differently if you lived today again?',
  'What are you pretending not to know?',
  'Which small win today deserves more credit than you gave it?',
  'What drained your energy today, and what gave it back?',
  'If this year were a book, what would this chapter be called?',
  'What fear is quietly making decisions for you?',
  'Who helped you today, and did you tell them?',
  'What would you attempt if you knew you could not fail?',
  'What did you learn today that you want to remember in a year?',
];

export default function Journal() {
  const state = useAppState();
  const today = todayKey();
  const [date, setDate] = useState(() => takePendingDate() ?? today);
  const entry = state.journal[date] ?? {};
  const gratitude = entry.gratitude ?? ['', '', ''];
  const mood = state.days[date]?.mood;
  const prompt = PROMPTS[dayOfYear(parseYmd(date)) % PROMPTS.length];

  const entries = Object.keys(state.journal)
    .filter((k) => journalHasContent(state.journal[k]))
    .sort()
    .reverse();
  const listed = entries.includes(today) ? entries : [today, ...entries];

  const save = (patch) => setJournal(date, patch);

  return (
    <div className="journal">
      <header className="page-head">
        <div>
          <h1>Journal</h1>
          <p>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} written. Two minutes at night is enough to see your growth clearly.
          </p>
        </div>
        <div className="page-actions">
          <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
            <ChevronLeft />
          </button>
          <button className="btn btn-sm" onClick={() => setDate(today)} disabled={date === today}>
            Today
          </button>
          <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="Next day">
            <ChevronRight />
          </button>
        </div>
      </header>

      <div className="journal-grid">
        <aside className="journal-list panel" aria-label="Entries">
          <ul>
            {listed.map((k) => {
              const e = state.journal[k];
              const m = MOODS.find((x) => x.value === state.days[k]?.mood);
              const MoodIcon = m?.icon;
              return (
                <li key={k}>
                  <button className={`journal-item${k === date ? ' active' : ''}`} onClick={() => setDate(k)}>
                    <span className="journal-item-date">
                      <strong>{relativeDays(k) === 'Today' ? 'Today' : formatShort(k)}</strong>
                      <span className="faint">{formatWeekday(k)}</span>
                    </span>
                    <span className="journal-item-text">{e?.win || e?.notes || e?.gratitude?.find((g) => g) || 'Not written yet'}</span>
                    {MoodIcon && <MoodIcon className="journal-item-mood" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <article className="journal-page" key={date}>
          <h2 className="display journal-date">{formatFull(date)}</h2>
          <p className="journal-prompt">
            <PenLine /> {prompt}
          </p>

          <div className="journal-section">
            <h4>How was today?</h4>
            <MoodPicker value={mood} onChange={(m) => setDayMood(date, m)} />
          </div>

          <div className="journal-section">
            <h4>
              <Heart /> Three things I'm grateful for
            </h4>
            <div className="gratitude">
              {[0, 1, 2].map((i) => (
                <div key={i} className="gratitude-line">
                  <span className="num">{i + 1}</span>
                  <InlineEdit
                    value={gratitude[i]}
                    onSave={(v) => save({ gratitude: [0, 1, 2].map((j) => (j === i ? v : gratitude[j] ?? '')) })}
                    placeholder={['Someone who made today better', 'Something small that went right', 'Something you usually take for granted'][i]}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="journal-2col">
            <div className="journal-section">
              <h4>
                <Trophy /> Today's win
              </h4>
              <InlineEdit className="textarea" multiline value={entry.win} onSave={(win) => save({ win })} placeholder="Big or small, it counts." />
            </div>
            <div className="journal-section">
              <h4>
                <Lightbulb /> What I learned
              </h4>
              <InlineEdit className="textarea" multiline value={entry.lesson} onSave={(lesson) => save({ lesson })} placeholder="A mistake, an insight, a pattern you noticed." />
            </div>
          </div>

          <div className="journal-section">
            <h4>
              <Sunrise /> Tomorrow I will
            </h4>
            <InlineEdit className="input" value={entry.tomorrow} onSave={(tomorrow) => save({ tomorrow })} placeholder="The one thing that would make tomorrow a win" />
          </div>

          <div className="journal-section">
            <h4>
              <NotebookPen /> Free write
            </h4>
            <InlineEdit className="textarea journal-free" multiline value={entry.notes} onSave={(notes) => save({ notes })} placeholder={prompt} />
          </div>
        </article>
      </div>
    </div>
  );
}
