/**
 * Loader.jsx – Reusable loading spinner / skeleton
 */
export const Spinner = ({ size = 'md', color = 'primary' }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  const colors = { primary: 'border-primary-600', white: 'border-white', slate: 'border-slate-600' };
  return (
    <div
      className={`${sizes[size]} rounded-full border-2 border-t-transparent animate-spin ${colors[color] || colors.primary}`}
      role="status"
      aria-label="Loading"
    />
  );
};

export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      <p className="text-slate-500 text-sm font-medium">Loading LocalPulse…</p>
    </div>
  </div>
);

export const CardSkeleton = () => (
  <div className="card p-5 animate-pulse space-y-3">
    <div className="h-4 bg-slate-200 rounded w-3/4" />
    <div className="h-3 bg-slate-200 rounded w-1/2" />
    <div className="h-3 bg-slate-200 rounded w-2/3" />
    <div className="flex gap-2 pt-2">
      <div className="h-6 w-20 bg-slate-200 rounded-full" />
      <div className="h-6 w-16 bg-slate-200 rounded-full" />
    </div>
  </div>
);

export default Spinner;
