/**
 * StatsBar — footer counts from GET /api/v1/tasks/stats (§4.9) and the
 * "Clear completed" action → DELETE /api/v1/tasks/completed (§4.8).
 */
export default function StatsBar({ stats, onClearCompleted }) {
  if (!stats) return null;

  const { total, completed, pending, inProgress, byPriority } = stats;

  return (
    <section className="card stats" aria-label="Statistics">
      <span className="stat">
        <strong>{completed}</strong> of <strong>{total}</strong> done
      </span>
      <span className="stat stat-muted">{pending} pending</span>
      <span className="stat stat-muted">{inProgress} in progress</span>
      <span className="stat stat-muted">
        high {byPriority.high} · medium {byPriority.medium} · low {byPriority.low}
      </span>

      <button
        className="btn btn-danger btn-small"
        type="button"
        onClick={onClearCompleted}
        disabled={completed === 0}
      >
        Clear completed ({completed})
      </button>
    </section>
  );
}
