import TaskItem from './TaskItem.jsx';
import Spinner from './Spinner.jsx';
import ErrorBanner from './ErrorBanner.jsx';

/**
 * TaskList — renders the tasks returned by GET /tasks (§4.2) plus the
 * three UI states the plan asks for: loading indicator, error message
 * with retry, and an empty state.
 */
export default function TaskList({
  tasks,
  loading,
  refreshing,
  error,
  filtered,
  pagination,
  onPageChange,
  onRetry,
  onToggle,
  onEdit,
  onDelete,
}) {
  if (loading) return <Spinner label="Loading tasks…" />;
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-title">{filtered ? 'No tasks match your filters' : 'No tasks yet'}</p>
        <p className="empty-hint">
          {filtered ? 'Try a different search, or clear the filters.' : 'Add your first task above.'}
        </p>
      </div>
    );
  }

  return (
    <section className="task-section" aria-label="Task list">
      {refreshing && <span className="refreshing">Updating…</span>}

      <ul className="task-list">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>

      {pagination && pagination.totalPages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          <button
            className="btn btn-ghost btn-small"
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            ← Prev
          </button>
          <span className="page-info">
            Page {pagination.page} of {pagination.totalPages} · {pagination.totalTasks} task
            {pagination.totalTasks === 1 ? '' : 's'}
          </span>
          <button
            className="btn btn-ghost btn-small"
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next →
          </button>
        </nav>
      )}
    </section>
  );
}
