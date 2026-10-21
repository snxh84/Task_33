import { useState } from 'react';
import { dateInputToIso, formatDueDate, isoToDateInput, isOverdue } from '../utils/dates';

/**
 * TaskItem — one task row with optimistic toggle, inline edit and delete.
 *
 *   checkbox  → PATCH /tasks/:id/toggle  (§4.6, flip on the server)
 *   Save      → PUT   /tasks/:id         (§4.4, full replacement)
 *   Delete    → DELETE /tasks/:id        (§4.7)
 *
 * The PUT payload includes status/completed so editing a task never
 * silently resets its completion state (PUT replaces the whole object).
 */
export default function TaskItem({ task, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draft, setDraft] = useState(null);

  const dueDateLabel = formatDueDate(task.dueDate);
  const overdue = isOverdue(task.dueDate, task.completed);

  const startEditing = () => {
    setDraft({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: isoToDateInput(task.dueDate),
      category: task.category || '',
    });
    setEditing(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;

    setSaving(true);
    const ok = await onEdit(task.id, {
      title,
      description: draft.description.trim(),
      priority: draft.priority,
      dueDate: dateInputToIso(draft.dueDate),
      category: draft.category.trim(),
      // PUT replaces everything — keep the completion state intact:
      status: task.status,
      completed: task.completed,
    });
    setSaving(false);
    if (ok) setEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setDeleting(true);
    await onDelete(task.id); // optimistic — removed instantly on success
  };

  if (editing && draft) {
    return (
      <li className="task-item task-item-editing">
        <form className="edit-form" onSubmit={handleSave}>
          <input
            className="input"
            type="text"
            name="title"
            value={draft.title}
            onChange={handleChange}
            maxLength={200}
            required
            autoFocus
            aria-label="Edit title"
          />
          <textarea
            className="input"
            name="description"
            value={draft.description}
            onChange={handleChange}
            rows={2}
            maxLength={2000}
            aria-label="Edit description"
          />
          <div className="edit-options">
            <select name="priority" value={draft.priority} onChange={handleChange} aria-label="Priority">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              name="dueDate"
              value={draft.dueDate}
              onChange={handleChange}
              aria-label="Due date"
            />
            <input
              type="text"
              name="category"
              value={draft.category}
              onChange={handleChange}
              placeholder="Category"
              maxLength={100}
              aria-label="Category"
            />
          </div>
          <div className="edit-actions">
            <button className="btn btn-primary btn-small" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              className="btn btn-ghost btn-small"
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`task-item ${task.completed ? 'task-done' : ''}`}>
      <label className="task-check" title={task.completed ? 'Mark as pending' : 'Mark as complete'}>
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          aria-label={`Mark "${task.title}" as ${task.completed ? 'pending' : 'complete'}`}
        />
      </label>

      <div className="task-body">
        <p className="task-title">{task.title}</p>
        {task.description && <p className="task-desc">{task.description}</p>}

        <div className="task-meta">
          <span className={`pill pill-status status-${task.status}`}>{task.status}</span>
          <span className={`pill pill-priority priority-${task.priority}`}>{task.priority}</span>
          {dueDateLabel && (
            <span className={`pill pill-date ${overdue ? 'pill-overdue' : ''}`}>
              {overdue ? 'overdue · ' : 'due '}
              {dueDateLabel}
            </span>
          )}
          {task.category && <span className="pill pill-category">#{task.category}</span>}
        </div>
      </div>

      <div className="task-actions">
        <button className="btn btn-ghost btn-small" type="button" onClick={startEditing}>
          Edit
        </button>
        <button
          className="btn btn-danger btn-small"
          type="button"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </li>
  );
}
