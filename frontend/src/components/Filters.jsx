/**
 * Filters — search (debounced by App), status and priority filters.
 * Everything here becomes query parameters on GET /api/v1/tasks (§4.2).
 */
export default function Filters({ search, status, priority, onChange, onClear }) {
  const hasFilters = Boolean(search || status || priority);

  return (
    <section className="card filters" aria-label="Filters">
      <input
        className="input search-input"
        type="search"
        value={search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Search title or description…"
        aria-label="Search tasks"
      />

      <select
        value={status}
        onChange={(e) => onChange({ status: e.target.value })}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="in-progress">In progress</option>
        <option value="completed">Completed</option>
      </select>

      <select
        value={priority}
        onChange={(e) => onChange({ priority: e.target.value })}
        aria-label="Filter by priority"
      >
        <option value="">All priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      {hasFilters && (
        <button className="btn btn-ghost btn-small" type="button" onClick={onClear}>
          Clear filters
        </button>
      )}
    </section>
  );
}
