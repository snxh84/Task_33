/** Full-page loading indicator (Part 2, step 3). */
export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner-circle" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
