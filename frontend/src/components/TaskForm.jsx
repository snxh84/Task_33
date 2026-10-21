import { useState } from 'react';
import { dateInputToIso } from '../utils/dates';

const EMPTY_FORM = { title: '', description: '', priority: 'medium', dueDate: '', category: '' };

/**
 * TaskForm — the "Add" button of the app.
 * Submitting calls addTask() → POST /api/v1/tasks (§4.1).
 */
export default function TaskForm({ onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    setSubmitting(true);
    const ok = await onSubmit({
      title,
      description: form.description.trim(),
      priority: form.priority,
      dueDate: dateInputToIso(form.dueDate),
      category: form.category.trim(),
    });
    setSubmitting(false);

    // Only reset when the API accepted the task — otherwise the user's
    // typing is preserved so they can fix the reported error.
    if (ok) setForm(EMPTY_FORM);
  };

  return (
    <form className="card task-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <input
          className="input input-title"
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="What needs to be done?"
          maxLength={200}
          required
          aria-label="Task title"
        />
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add task'}
        </button>
      </div>

      <textarea
        className="input"
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Description (optional)"
        rows={2}
        maxLength={2000}
        aria-label="Task description"
      />

      <div className="form-row form-row-options">
        <label className="field">
          <span>Priority</span>
          <select name="priority" value={form.priority} onChange={handleChange}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="field">
          <span>Due date</span>
          <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} />
        </label>

        <label className="field">
          <span>Category</span>
          <input
            type="text"
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="e.g. work"
            maxLength={100}
          />
        </label>
      </div>
    </form>
  );
}
