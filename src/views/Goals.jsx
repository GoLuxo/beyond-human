import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Star, X, Trash2, Trophy, RotateCcw, CalendarDays, Target, Flag } from 'lucide-react';
import { useAppState } from '../state/store.js';
import { updateProfile, updateGoal, deleteGoal, setGoalComplete, addMilestone, toggleMilestone, deleteMilestone } from '../state/actions.js';
import { useApp } from '../AppContext.js';
import { Drawer, InlineEdit, ProgressRing, StarCheck, Empty, Field } from '../components/ui.jsx';
import { goalProgress } from '../lib/progress.js';
import { GOAL_CATEGORIES, categoryOf } from '../lib/icons.js';
import { formatShort, diffDays, todayKey, ymd } from '../lib/dates.js';
import { completed, play } from '../lib/feedback.js';
import { celebrate, toast } from '../lib/events.js';

function deadlineText(goal) {
  if (goal.completedAt) return `Completed ${formatShort(ymd(new Date(goal.completedAt)))}`;
  if (!goal.deadline) return 'No deadline';
  const n = diffDays(todayKey(), goal.deadline);
  if (n < 0) return `${-n} days overdue`;
  if (n === 0) return 'Due today';
  return `${n} days left`;
}

function GoalDrawer({ goal, tasks, onClose }) {
  const { openTask } = useApp();
  const [milestone, setMilestone] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setConfirmDelete(false), [goal?.id]);

  if (!goal) return <Drawer open={false} onClose={onClose} />;
  const progress = goalProgress(goal);
  const linked = tasks.filter((t) => t.goalId === goal.id);
  const cat = categoryOf(goal.category);
  const CatIcon = cat.icon;

  const add = () => {
    if (!milestone.trim()) return;
    addMilestone(goal.id, milestone);
    play('tick');
    setMilestone('');
  };

  return (
    <Drawer open onClose={onClose} label={goal.title}>
      <div className="goal-drawer">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="tag">
            <CatIcon /> {cat.label}
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>

        <div className="goal-drawer-hero">
          <ProgressRing value={progress} size={96} stroke={3}>
            <span className="num goal-pct">{Math.round(progress * 100)}%</span>
          </ProgressRing>
          <InlineEdit className="input-bare goal-title-edit display" value={goal.title} onSave={(title) => title.trim() && updateGoal(goal.id, { title: title.trim() })} ariaLabel="Goal title" />
        </div>

        <div className="grid-2">
          <Field label="Area of life">
            <select className="select" value={goal.category} onChange={(e) => updateGoal(goal.id, { category: e.target.value })}>
              {Object.entries(GOAL_CATEGORIES).map(([k, c]) => (
                <option key={k} value={k}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deadline">
            <input className="input" type="date" value={goal.deadline ?? ''} onChange={(e) => updateGoal(goal.id, { deadline: e.target.value || null })} />
          </Field>
        </div>

        <Field label="Why it matters">
          <InlineEdit className="textarea" multiline value={goal.why} onSave={(why) => updateGoal(goal.id, { why })} placeholder="When it gets hard, this is what you'll read." ariaLabel="Why it matters" />
        </Field>

        <h4 className="drawer-label">Milestones</h4>
        {goal.milestones.length === 0 && (
          <div className="manual-progress">
            <span className="muted">No milestones yet. Track progress by hand, or break it into steps below.</span>
            <input type="range" min="0" max="100" step="5" value={goal.progress ?? 0} onChange={(e) => updateGoal(goal.id, { progress: Number(e.target.value) })} aria-label="Progress" />
          </div>
        )}
        <ul className="milestones">
          {goal.milestones.map((m) => (
            <li key={m.id} className={m.done ? 'done' : ''}>
              <StarCheck
                checked={m.done}
                label={m.title}
                onToggle={(e) => {
                  if (toggleMilestone(goal.id, m.id)) completed(e, 0.9);
                  else play('uncheck');
                }}
              />
              <span>{m.title}</span>
              <button className="icon-btn sm" onClick={() => deleteMilestone(goal.id, m.id)} aria-label={`Delete ${m.title}`}>
                <X />
              </button>
            </li>
          ))}
        </ul>
        <div className="quick-add">
          <Flag />
          <input className="input-bare" value={milestone} onChange={(e) => setMilestone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Add a milestone and press Enter" aria-label="New milestone" />
        </div>

        <h4 className="drawer-label">Linked tasks</h4>
        <p className="muted">
          {linked.length ? `${linked.filter((t) => t.done).length} of ${linked.length} tasks done for this goal.` : 'No tasks linked yet.'}
        </p>
        <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => openTask({ defaults: { goalId: goal.id } })}>
          <Plus /> Plan a task for this goal
        </button>

        <div className="goal-drawer-foot">
          {goal.completedAt ? (
            <button className="btn" onClick={() => setGoalComplete(goal.id, false)}>
              <RotateCcw /> Reopen goal
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={(e) => {
                setGoalComplete(goal.id, true);
                play('levelUp');
                celebrate(e, 2.6);
                toast(`Goal complete: ${goal.title}`, { icon: Trophy });
              }}
            >
              <Trophy /> Mark goal complete
            </button>
          )}
          <button
            className="btn btn-ghost btn-danger"
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              deleteGoal(goal.id);
              toast('Goal deleted');
              return onClose();
            }}
          >
            <Trash2 /> {confirmDelete ? 'Click again to delete' : 'Delete'}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

function GoalTile({ goal, onOpen, index }) {
  const progress = goalProgress(goal);
  const cat = categoryOf(goal.category);
  const Icon = cat.icon;
  const next = goal.milestones.find((m) => !m.done);
  return (
    <motion.button
      className={`goal-tile${goal.completedAt ? ' complete' : ''}`}
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="goal-tile-top">
        <ProgressRing value={progress} size={58} stroke={2.5}>
          <Icon size={18} />
        </ProgressRing>
        <span className="goal-tile-pct num">{Math.round(progress * 100)}%</span>
      </div>
      <h3>{goal.title}</h3>
      <div className="goal-tile-meta">
        <span className="tag">
          <CalendarDays /> {deadlineText(goal)}
        </span>
        <span className="tag">{cat.label}</span>
      </div>
      {next && !goal.completedAt && (
        <p className="goal-next">
          <span className="faint">Next:</span> {next.title}
        </p>
      )}
    </motion.button>
  );
}

export default function Goals() {
  const state = useAppState();
  const { openGoal, focusGoalId, setFocusGoal } = useApp();
  const [openId, setOpenId] = useState(focusGoalId);

  useEffect(() => {
    if (focusGoalId) {
      setOpenId(focusGoalId);
      setFocusGoal(null);
    }
  }, [focusGoalId, setFocusGoal]);

  const active = state.goals.filter((g) => !g.completedAt);
  const done = state.goals.filter((g) => g.completedAt);
  const open = state.goals.find((g) => g.id === openId) ?? null;

  return (
    <div className="goals">
      <header className="page-head">
        <div>
          <h1>Goals</h1>
          <p>
            {active.length} in orbit, {done.length} reached. Break each one into milestones and link tasks to it from the planner.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openGoal}>
            <Plus /> New goal
          </button>
        </div>
      </header>

      <section className="north-star">
        <Star className="north-star-icon" />
        <div className="north-star-body">
          <span className="muted">Your North Star</span>
          <InlineEdit className="input-bare north-star-text display" value={state.profile.northStar} onSave={(northStar) => updateProfile({ northStar })} placeholder="The one goal that would change everything" ariaLabel="North Star" />
          <InlineEdit className="input-bare north-star-why" value={state.profile.why} onSave={(why) => updateProfile({ why })} placeholder="Why it matters to you" ariaLabel="Why your North Star matters" />
        </div>
      </section>

      {active.length ? (
        <div className="goal-grid">
          {active.map((g, i) => (
            <GoalTile key={g.id} goal={g} index={i} onOpen={() => setOpenId(g.id)} />
          ))}
          <button className="goal-tile goal-add" onClick={openGoal}>
            <Plus />
            <span>New goal</span>
          </button>
        </div>
      ) : (
        <section className="panel">
          <Empty icon={Target} title="No goals in orbit" action={<button className="btn btn-primary" onClick={openGoal}><Plus /> Set your first goal</button>}>
            A goal with a deadline and milestones is a plan. Without them it's a wish.
          </Empty>
        </section>
      )}

      {done.length > 0 && (
        <>
          <h2 className="section-title">Reached</h2>
          <div className="goal-grid">
            {done.map((g, i) => (
              <GoalTile key={g.id} goal={g} index={i} onOpen={() => setOpenId(g.id)} />
            ))}
          </div>
        </>
      )}

      <GoalDrawer goal={open} tasks={state.tasks} onClose={() => setOpenId(null)} />
    </div>
  );
}
