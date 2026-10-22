import { motion } from 'framer-motion';
import { Clock, Target } from 'lucide-react';
import { StarCheck } from './ui.jsx';
import { toggleTask } from '../state/actions.js';
import { completed, play } from '../lib/feedback.js';
import { formatTime } from '../lib/dates.js';

const PRIORITY = { 1: 'High', 2: 'Medium', 3: 'Low' };

export default function TaskRow({ task, goal, onEdit, showTime = true }) {
  const onToggle = (e) => {
    const done = toggleTask(task.id);
    if (done) completed(e, task.priority === 1 ? 1 : 0.6);
    else play('uncheck');
  };

  return (
    <motion.li
      layout
      className={`task-row${task.done ? ' done' : ''}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
    >
      <StarCheck checked={task.done} onToggle={onToggle} label={task.done ? `Mark "${task.title}" as not done` : `Complete "${task.title}"`} />
      <button className="task-main" onClick={() => onEdit(task)}>
        <span className="task-title">
          {task.priority === 1 && !task.done && <i className="prio-dot" aria-label="High priority" />}
          {task.title}
        </span>
        <span className="task-meta">
          {showTime && task.time && (
            <span className="tag">
              <Clock /> {formatTime(task.time)}
            </span>
          )}
          {task.priority !== 2 && <span className="tag">{PRIORITY[task.priority]}</span>}
          {goal && (
            <span className="tag">
              <Target /> {goal.title}
            </span>
          )}
        </span>
      </button>
    </motion.li>
  );
}

export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time !== b.time) return a.time ? -1 : 1;
    return a.priority - b.priority || a.createdAt.localeCompare(b.createdAt);
  });
}
