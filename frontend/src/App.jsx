import { useCallback, useEffect, useMemo, useState } from 'react';
import useTasks from './hooks/useTasks.js';
import TaskForm from './components/TaskForm.jsx';
import TaskList from './components/TaskList.jsx';
import Filters from './components/Filters.jsx';
import StatsBar from './components/StatsBar.jsx';
import ErrorBanner from './components/ErrorBanner.jsx';

/**
 * App — ties the UI to the backend.
 *
 * Every user action maps to exactly one API call from the plan:
 *   add        → POST   /api/v1/tasks
 *   list       → GET    /api/v1/tasks?search=…&status=…&priority=…&page=…
 *   edit       → PUT    /api/v1/tasks/:id
 *   toggle     → PATCH  /api/v1/tasks/:id/toggle
 *   delete     → DELETE /api/v1/tasks/:id
 *   clear done → DELETE /api/v1/tasks/completed
 *   stats      → GET    /api/v1/tasks/stats
 */
export default function App() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the search box (300 ms) so typing does not fire one
  // request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo(
    () => ({ search: debouncedSearch, status, priority, page, limit: 6 }),
    [debouncedSearch, status, priority, page]
  );

  const {
    tasks,
    pagination,
    stats,
    loading,
    refreshing,
    loadError,
    actionError,
    addTask,
    updateTask,
    toggleTask,
    removeTask,
    clearCompleted,
    retry,
    dismissActionError,
  } = useTasks(filters);

  // Action errors dismiss themselves after a few seconds.
  useEffect(() => {
    if (!actionError) return undefined;
    const timer = setTimeout(dismissActionError, 6000);
    return () => clearTimeout(timer);
  }, [actionError, dismissActionError]);

  const handleFilterChange = useCallback((patch) => {
    if ('search' in patch) setSearch(patch.search);
    if ('status' in patch) {
      setStatus(patch.status);
      setPage(1);
    }
    if ('priority' in patch) {
      setPriority(patch.priority);
      setPage(1);
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setStatus('');
    setPriority('');
    setPage(1);
  }, []);

  const handleClearCompleted = useCallback(async () => {
    if (stats && stats.completed > 0) {
      const sure = window.confirm(`Delete ${stats.completed} completed task(s)?`);
      if (!sure) return;
    }
    await clearCompleted();
  }, [clearCompleted, stats]);

  const filtered = Boolean(debouncedSearch || status || priority);

  return (
    <div className="app">
      <header className="app-header">
        <h1>To-Do List</h1>
        <p className="subtitle">React · Express.js · MongoDB</p>
      </header>

      {actionError && (
        <ErrorBanner message={actionError} onClose={dismissActionError} />
      )}

      <TaskForm onSubmit={addTask} />

      <StatsBar stats={stats} onClearCompleted={handleClearCompleted} />

      <Filters
        search={search}
        status={status}
        priority={priority}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      <TaskList
        tasks={tasks}
        loading={loading}
        refreshing={refreshing}
        error={loadError}
        filtered={filtered}
        pagination={pagination}
        onPageChange={setPage}
        onRetry={retry}
        onToggle={toggleTask}
        onEdit={updateTask}
        onDelete={removeTask}
      />

      <footer className="app-footer">
        Data stored in MongoDB · API built with Express.js · See README for setup
      </footer>
    </div>
  );
}
