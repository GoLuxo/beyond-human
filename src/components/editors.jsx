import { useEffect, useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { Modal, Field, Segmented, Switch } from './ui.jsx';
import { addTask, updateTask, deleteTask, addHabit, updateHabit, deleteHabit, addGoal } from '../state/actions.js';
import { HABIT_ICONS, GOAL_CATEGORIES, HABIT_SUGGESTIONS } from '../lib/icons.js';
import { todayKey, weekdayLabels } from '../lib/dates.js';
import { toast } from '../lib/events.js';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];
const durationLabel = (m) => (m < 60 ? `${m} min` : `${m / 60} h`.replace('.5 h', ' h 30'));

export function TaskModal({ open, onClose, task, defaults, goals }) {
  const editing = Boolean(task?.id);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: task?.title ?? '',
      date: task?.date ?? defaults?.date ?? todayKey(),
      scheduled: Boolean(task?.time ?? defaults?.time),
      time: task?.time ?? defaults?.time ?? '09:00',
      duration: task?.duration ?? 30,
      priority: task?.priority ?? 2,
      goalId: task?.goalId ?? defaults?.goalId ?? '',
      notes: task?.notes ?? '',
    });
  }, [open, task, defaults]);

  if (!form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      date: form.date || todayKey(),
      time: form.scheduled ? form.time : null,
      duration: Number(form.duration),
      priority: form.priority,
      goalId: form.goalId || null,
      notes: form.notes,
    };
    if (editing) {
      updateTask(task.id, payload);
      toast('Task saved');
    } else {
      addTask(payload);
      toast('Task added');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit task' : 'Add a task'}
      footer={
        <>
          {editing && (
            <button
              className="btn btn-ghost btn-danger"
              onClick={() => {
                deleteTask(task.id);
                toast('Task deleted');
                onClose();
              }}
            >
              <Trash2 /> Delete
            </button>
          )}
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!form.title.trim()}>
            {editing ? 'Save task' : 'Add task'}
          </button>
        </>
      }
    >
      <form
        className="modal-body"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="What needs doing?">
          <input className="input" autoFocus value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Finish the pitch deck" />
        </Field>
        <div className="grid-2">
          <Field label="Day">
            <input className="input" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Priority">
            <Segmented
              label="Priority"
              value={form.priority}
              onChange={(priority) => set({ priority })}
              options={[
                { value: 1, label: 'High' },
                { value: 2, label: 'Medium' },
                { value: 3, label: 'Low' },
              ]}
            />
          </Field>
        </div>
        <div className="toggle-row">
          <div>
            <strong>Schedule a time</strong>
            <p className="muted">Puts it on your timeline and reminds you before it starts.</p>
          </div>
          <Switch checked={form.scheduled} onChange={(scheduled) => set({ scheduled })} label="Schedule a time" />
        </div>
        {form.scheduled && (
          <div className="grid-2">
            <Field label="Starts at">
              <input className="input" type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} />
            </Field>
            <Field label="Takes">
              <select className="select" value={form.duration} onChange={(e) => set({ duration: Number(e.target.value) })}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {durationLabel(d)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        {goals.length > 0 && (
          <Field label="Moves this goal forward">
            <select className="select" value={form.goalId} onChange={(e) => set({ goalId: e.target.value })}>
              <option value="">No goal</option>
              {goals
                .filter((g) => !g.completedAt)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
            </select>
          </Field>
        )}
        <Field label="Notes">
          <textarea className="textarea" rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything you'll want to remember" />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const scheduleKind = (days) => {
  const sorted = [...days].sort().join();
  if (sorted === EVERY_DAY.join()) return 'daily';
  if (sorted === WEEKDAYS.join()) return 'weekdays';
  return 'custom';
};

export function HabitModal({ open, onClose, habit, weekStart }) {
  const editing = Boolean(habit?.id);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: habit?.name ?? '',
      icon: habit?.icon ?? 'sparkles',
      days: habit?.days ?? EVERY_DAY,
      remind: Boolean(habit?.reminder),
      reminder: habit?.reminder ?? '08:00',
    });
  }, [open, habit]);

  if (!form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const kind = scheduleKind(form.days);

  const save = () => {
    if (!form.name.trim() || !form.days.length) return;
    const payload = { name: form.name.trim(), icon: form.icon, days: form.days, reminder: form.remind ? form.reminder : null };
    if (editing) {
      updateHabit(habit.id, payload);
      toast('Habit saved');
    } else {
      addHabit(payload);
      toast('Habit created. Day one starts now.');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit habit' : 'Create a habit'}
      subtitle={editing ? undefined : 'Small and specific beats big and vague.'}
      footer={
        <>
          {editing && (
            <button
              className="btn btn-ghost btn-danger"
              onClick={() => {
                deleteHabit(habit.id);
                toast('Habit deleted');
                onClose();
              }}
            >
              <Trash2 /> Delete
            </button>
          )}
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!form.name.trim() || !form.days.length}>
            {editing ? 'Save habit' : 'Create habit'}
          </button>
        </>
      }
    >
      <Field label="Habit">
        <input
          className="input"
          autoFocus
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Read 20 pages"
        />
      </Field>
      {!editing && !form.name && (
        <div className="chip-row">
          {HABIT_SUGGESTIONS.slice(0, 6).map((s) => (
            <button key={s.name} className="chip" onClick={() => set({ name: s.name, icon: s.icon })}>
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="field">
        <span>Icon</span>
        <div className="icon-grid">
          {Object.entries(HABIT_ICONS).map(([key, Icon]) => (
            <button key={key} className={`icon-choice${form.icon === key ? ' active' : ''}`} onClick={() => set({ icon: key })} aria-label={key} aria-pressed={form.icon === key}>
              <Icon />
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Repeat</span>
        <Segmented
          label="Repeat"
          value={kind}
          onChange={(k) => set({ days: k === 'daily' ? EVERY_DAY : k === 'weekdays' ? WEEKDAYS : kind === 'custom' ? form.days : [1, 3, 5] })}
          options={[
            { value: 'daily', label: 'Every day' },
            { value: 'weekdays', label: 'Weekdays' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        <div className="day-picker">
          {weekdayLabels(weekStart).map(({ day, short }) => {
            const on = form.days.includes(day);
            return (
              <button
                key={day}
                aria-pressed={on}
                className="day-toggle"
                onClick={() => set({ days: on ? form.days.filter((d) => d !== day) : [...form.days, day] })}
              >
                {short}
              </button>
            );
          })}
        </div>
      </div>
      <div className="toggle-row">
        <div>
          <strong>Remind me</strong>
          <p className="muted">A Windows notification if it isn't checked off yet.</p>
        </div>
        <Switch checked={form.remind} onChange={(remind) => set({ remind })} label="Remind me" />
      </div>
      {form.remind && (
        <Field label="At">
          <input className="input" type="time" value={form.reminder} onChange={(e) => set({ reminder: e.target.value })} />
        </Field>
      )}
    </Modal>
  );
}

export function GoalModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (open) setForm({ title: '', category: 'growth', deadline: '', why: '', milestones: ['', ''] });
  }, [open]);

  if (!form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = () => {
    if (!form.title.trim()) return;
    const id = addGoal(form);
    toast('Goal set. Now break it into steps.');
    onClose();
    onCreated?.(id);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Set a new goal"
      subtitle="Make it specific enough that you'll know the day you hit it."
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!form.title.trim()}>
            Set goal
          </button>
        </>
      }
    >
      <Field label="Goal">
        <input className="input" autoFocus value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Run a half marathon under 2 hours" />
      </Field>
      <div className="field">
        <span>Area of life</span>
        <div className="chip-row">
          {Object.entries(GOAL_CATEGORIES).map(([key, c]) => {
            const Icon = c.icon;
            return (
              <button key={key} className="chip" aria-pressed={form.category === key} onClick={() => set({ category: key })}>
                <Icon /> {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid-2">
        <Field label="Deadline">
          <input className="input" type="date" value={form.deadline} min={todayKey()} onChange={(e) => set({ deadline: e.target.value })} />
        </Field>
        <div />
      </div>
      <Field label="Why does this matter to you?">
        <textarea className="textarea" rows={2} value={form.why} onChange={(e) => set({ why: e.target.value })} placeholder="When it gets hard, this is what you'll read." />
      </Field>
      <div className="field">
        <span>Milestones</span>
        <div className="milestone-inputs">
          {form.milestones.map((m, i) => (
            <div key={i} className="row">
              <input
                className="input"
                value={m}
                placeholder={i === 0 ? 'First step' : 'Next step'}
                onChange={(e) => set({ milestones: form.milestones.map((x, j) => (j === i ? e.target.value : x)) })}
              />
              <button className="icon-btn" aria-label="Remove milestone" onClick={() => set({ milestones: form.milestones.filter((_, j) => j !== i) })}>
                <X />
              </button>
            </div>
          ))}
          <button className="btn btn-sm" onClick={() => set({ milestones: [...form.milestones, ''] })}>
            <Plus /> Add milestone
          </button>
        </div>
      </div>
    </Modal>
  );
}
