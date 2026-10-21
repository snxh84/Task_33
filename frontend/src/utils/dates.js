/** Small date helpers shared by the form and list components. */

/**
 * Turns a <input type="date"> value (YYYY-MM-DD) into a full ISO 8601
 * string built from *local* midnight — the plan (C11) requires the
 * client to send ISO 8601, and the server stores it as UTC.
 */
export function dateInputToIso(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).toISOString();
}

/** ISO string → value for <input type="date">. */
export function isoToDateInput(iso) {
  return iso ? iso.slice(0, 10) : '';
}

/** Human-readable due date, e.g. "Oct 25, 2026". */
export function formatDueDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Overdue = due date is in the past and the task is not completed. */
export function isOverdue(iso, completed) {
  if (!iso || completed) return false;
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}
