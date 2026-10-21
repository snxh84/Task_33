import { useCallback, useEffect, useReducer, useRef } from 'react';
import * as api from '../api/tasks';
import { getErrorMessage } from '../api/client';

/**
 * useTasks — the application's state management for tasks and stats
 * (Part 2, step 3/4: dynamic UI updates and user interaction).
 *
 * A single reducer keeps every piece of server state in one place, and
 * each user action maps to exactly one API call from the plan:
 *   add      → POST   /tasks
 *   edit     → PUT    /tasks/:id
 *   toggle   → PATCH  /tasks/:id/toggle
 *   delete   → DELETE /tasks/:id
 *   clear    → DELETE /tasks/completed
 *   search   → GET    /tasks?search=…
 *
 * Toggle and delete are optimistic — the UI reacts immediately and the
 * previous state is restored (or the list reloaded) if the request
 * fails, with the error surfaced to the user.
 */

const initialState = {
  tasks: [],
  pagination: null,
  stats: null,
  loading: true, // first load → full spinner
  refreshing: false, // background reload → subtle indicator
  loadError: null, // list failed to load
  actionError: null, // a mutation failed
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, loadError: null };
    case 'REFRESH_START':
      return { ...state, refreshing: true, loadError: null };
    case 'SET_LIST':
      return {
        ...state,
        loading: false,
        refreshing: false,
        loadError: null,
        tasks: action.payload.tasks,
        pagination: action.payload.pagination,
      };
    case 'LOAD_ERROR':
      return { ...state, loading: false, refreshing: false, loadError: action.payload };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'SET_ACTION_ERROR':
      return { ...state, actionError: action.payload };
    case 'CLEAR_ACTION_ERROR':
      return { ...state, actionError: null };
    case 'REPLACE_LOCAL':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? action.payload.task : t)),
      };
    case 'REMOVE_LOCAL':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload) };
    case 'TOGGLE_LOCAL':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload
            ? { ...t, completed: !t.completed, status: !t.completed ? 'completed' : 'pending' }
            : t
        ),
      };
    default:
      return state;
  }
}

export default function useTasks(filters) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Always-current copies so callbacks never capture stale filters.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async (currentFilters, { silent = false } = {}) => {
    dispatch({ type: silent ? 'REFRESH_START' : 'LOAD_START' });
    try {
      const data = await api.listTasks(currentFilters);
      dispatch({ type: 'SET_LIST', payload: data });
    } catch (error) {
      dispatch({ type: 'LOAD_ERROR', payload: getErrorMessage(error) });
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const stats = await api.getStats();
      dispatch({ type: 'SET_STATS', payload: stats });
    } catch (error) {
      // Stats are decorative — a failure shows nothing rather than
      // blocking the list.
      console.warn('Stats unavailable:', getErrorMessage(error));
    }
  }, []);

  /** Reload the list (against the current filters) and the stats. */
  const refreshAll = useCallback(
    (options) => Promise.all([load(filtersRef.current, options), loadStats()]),
    [load, loadStats]
  );

  // Reload whenever the filters change (search / status / priority / page).
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    load(filtersRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, load]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /* ---------------- user actions (one API call each) ---------------- */

  const addTask = useCallback(
    async (input) => {
      try {
        await api.createTask(input);
        await refreshAll({ silent: true });
        return true;
      } catch (error) {
        dispatch({ type: 'SET_ACTION_ERROR', payload: getErrorMessage(error) });
        return false;
      }
    },
    [refreshAll]
  );

  const updateTask = useCallback(
    async (id, input) => {
      try {
        const updated = await api.replaceTask(id, input);
        dispatch({ type: 'REPLACE_LOCAL', payload: { id, task: updated } });
        await loadStats();
        return true;
      } catch (error) {
        dispatch({ type: 'SET_ACTION_ERROR', payload: getErrorMessage(error) });
        return false;
      }
    },
    [loadStats]
  );

  const toggleTask = useCallback(async (id) => {
    // Optimistic: flip immediately, revert if the server disagrees.
    dispatch({ type: 'TOGGLE_LOCAL', payload: id });
    try {
      const updated = await api.toggleTask(id);
      dispatch({ type: 'REPLACE_LOCAL', payload: { id, task: updated } });
      loadStats();
    } catch (error) {
      dispatch({ type: 'TOGGLE_LOCAL', payload: id }); // roll back
      dispatch({ type: 'SET_ACTION_ERROR', payload: getErrorMessage(error) });
    }
  }, [loadStats]);

  const removeTask = useCallback(
    async (id) => {
      dispatch({ type: 'REMOVE_LOCAL', payload: id }); // optimistic
      try {
        await api.deleteTask(id);
        loadStats();
      } catch (error) {
        // Roll back by reloading the true list from the server.
        dispatch({ type: 'SET_ACTION_ERROR', payload: getErrorMessage(error) });
        load(filtersRef.current, { silent: true });
      }
    },
    [load, loadStats]
  );

  const clearCompleted = useCallback(async () => {
    try {
      const { deletedCount } = await api.clearCompletedTasks();
      await refreshAll({ silent: true });
      dispatch({
        type: deletedCount === 0 ? 'SET_ACTION_ERROR' : 'CLEAR_ACTION_ERROR',
        ...(deletedCount === 0 && { payload: 'No completed tasks to clear.' }),
      });
      return deletedCount;
    } catch (error) {
      dispatch({ type: 'SET_ACTION_ERROR', payload: getErrorMessage(error) });
      return null;
    }
  }, [refreshAll]);

  const retry = useCallback(() => refreshAll(), [refreshAll]);
  const dismissActionError = useCallback(() => dispatch({ type: 'CLEAR_ACTION_ERROR' }), []);

  return {
    ...state,
    addTask,
    updateTask,
    toggleTask,
    removeTask,
    clearCompleted,
    retry,
    dismissActionError,
  };
}
