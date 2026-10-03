/**
 * StatusBadge.jsx
 * Renders coloured badge for SRS §3.13 issue lifecycle statuses.
 * submitted → under_review → verified → assigned → in_progress → resolved
 */
const STATUS_CONFIG = {
  submitted:    { label: 'Submitted',    bg: 'bg-slate-100',   text: 'text-slate-700',   dot: 'bg-slate-400'   },
  under_review: { label: 'Under Review', bg: 'bg-yellow-100',  text: 'text-yellow-800',  dot: 'bg-yellow-500'  },
  verified:     { label: 'Verified',     bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-500'    },
  assigned:     { label: 'Assigned',     bg: 'bg-purple-100',  text: 'text-purple-800',  dot: 'bg-purple-500'  },
  in_progress:  { label: 'In Progress',  bg: 'bg-orange-100',  text: 'text-orange-800',  dot: 'bg-orange-500'  },
  resolved:     { label: 'Resolved',     bg: 'bg-green-100',   text: 'text-green-800',   dot: 'bg-green-500'   },
};

const SEVERITY_CONFIG = {
  low:      { label: 'Low',      bg: 'bg-slate-100',  text: 'text-slate-700'  },
  medium:   { label: 'Medium',   bg: 'bg-yellow-100', text: 'text-yellow-800' },
  high:     { label: 'High',     bg: 'bg-orange-100', text: 'text-orange-800' },
  critical: { label: 'Critical', bg: 'bg-red-100',    text: 'text-red-800'    },
};

export const StatusBadge = ({ status, size = 'sm' }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text} ${textSize}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

export const SeverityBadge = ({ severity }) => {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

export const CategoryBadge = ({ category }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
    {category}
  </span>
);

export default StatusBadge;
