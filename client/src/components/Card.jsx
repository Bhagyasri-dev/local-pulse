/**
 * Card.jsx – Reusable report card component
 */
import { MapPin, Clock, ThumbsUp, AlertTriangle, Copy } from 'lucide-react';
import { StatusBadge, SeverityBadge, CategoryBadge } from './StatusBadge';

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const ReportCard = ({ report, onClick, compact = false }) => {
  const ai = report.aiAnalysis || {};

  return (
    <div
      className={`card p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 ${
        report.status === 'resolved' ? 'border-l-green-500' :
        ai.isSuspicious ? 'border-l-red-400' :
        ai.isDuplicate  ? 'border-l-yellow-400' : 'border-l-primary-500'
      }`}
      onClick={() => onClick?.(report)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{report.description?.slice(0, 80)}…</p>
          <p className="text-muted mt-0.5">#{String(report._id).slice(-6).toUpperCase()}</p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <CategoryBadge category={report.category} />
        {ai.severity && <SeverityBadge severity={ai.severity} />}
        {ai.isSuspicious && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <AlertTriangle size={10} /> Suspicious
          </span>
        )}
        {ai.isDuplicate && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Copy size={10} /> Possible Duplicate
          </span>
        )}
      </div>

      {!compact && (
        <div className="flex items-center gap-4 text-muted border-t border-slate-100 pt-2 mt-2">
          {report.address && (
            <span className="flex items-center gap-1 truncate max-w-[180px]">
              <MapPin size={12} /> {report.address}
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto shrink-0">
            <Clock size={12} /> {fmt(report.createdAt)}
          </span>
          {report.verificationCount > 0 && (
            <span className="flex items-center gap-1 shrink-0">
              <ThumbsUp size={12} /> {report.verificationCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const StatsCard = ({ label, value, icon: Icon, color = 'primary', sub }) => (
  <div className="card p-5 flex items-start gap-4">
    <div className={`p-3 rounded-lg ${
      color === 'primary' ? 'bg-primary-100 text-primary-700' :
      color === 'green'   ? 'bg-green-100 text-green-700' :
      color === 'orange'  ? 'bg-orange-100 text-orange-700' :
      color === 'red'     ? 'bg-red-100 text-red-700' :
      color === 'purple'  ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
    }`}>
      <Icon size={22} />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-800">{value ?? 0}</p>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export default ReportCard;
