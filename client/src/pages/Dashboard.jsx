/**
 * Dashboard.jsx
 * Shows: submitted reports summary, recent reports, quick actions,
 * nearby issues count, and a Recharts status breakdown chart.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FilePlus, Map, ClipboardList, CheckCircle,
  Clock, AlertCircle, TrendingUp, MapPin, ArrowRight,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { reportAPI } from '../services/api';
import { StatsCard, ReportCard } from '../components/Card';
import { CardSkeleton } from '../components/Loader';
import toast from 'react-hot-toast';

// Colours matching the status lifecycle
const STATUS_COLORS = {
  submitted:    '#94a3b8',
  under_review: '#f59e0b',
  verified:     '#3b82f6',
  assigned:     '#8b5cf6',
  in_progress:  '#f97316',
  resolved:     '#10b981',
};

const QuickAction = ({ to, icon: Icon, label, desc, color }) => (
  <Link
    to={to}
    className={`card p-5 flex items-start gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 border-l-4 ${color} group`}
  >
    <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 group-hover:bg-white transition-colors">
      <Icon size={22} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
    </div>
    <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1 shrink-0" />
  </Link>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data } = await reportAPI.getMyReports();
        setReports(data.data || []);
      } catch {
        toast.error('Could not load your reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  // ── Derive stats ────────────────────────────────────────────────────────────
  const total    = reports.length;
  const resolved = reports.filter((r) => r.status === 'resolved').length;
  const pending  = reports.filter((r) => !['resolved'].includes(r.status)).length;
  const suspicious = reports.filter((r) => r.aiAnalysis?.isSuspicious).length;

  // ── Chart data ──────────────────────────────────────────────────────────────
  const statusCounts = {};
  reports.forEach((r) => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
  const chartData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value,
    fill: STATUS_COLORS[name] || '#94a3b8',
  }));

  const recent = [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* ── Greeting / header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Hello, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1.5">Here's an overview of your civic reports.</p>
        </div>
        <Link to="/report" className="btn-primary shrink-0">
          <FilePlus size={16} /> Report New Issue
        </Link>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Reports"  value={total}     icon={ClipboardList} color="primary" />
          <StatsCard label="Resolved"        value={resolved}  icon={CheckCircle}   color="green"   sub="Issues fixed" />
          <StatsCard label="In Progress"     value={pending}   icon={Clock}         color="orange"  sub="Awaiting action" />
          <StatsCard label="Flagged by AI"   value={suspicious}icon={AlertCircle}   color="red"     sub="Need review" />
        </div>
      )}

      {/* ── Main content: chart + quick actions ─────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">

        {/* Status distribution chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-600" /> Report Status Overview
            </h2>
          </div>

          {loading ? (
            <div className="h-48 bg-slate-100 animate-pulse rounded-xl" />
          ) : total === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <ClipboardList size={40} className="mb-3 opacity-40" />
              <p className="font-medium text-slate-500">No reports yet</p>
              <p className="text-sm">Submit your first civic issue to see stats here.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <h2 className="section-title">Quick Actions</h2>
          <QuickAction
            to="/report"
            icon={FilePlus}
            label="Report an Issue"
            desc="Submit a new civic issue with photo & location"
            color="border-l-primary-500"
          />
          <QuickAction
            to="/nearby"
            icon={Map}
            label="Nearby Issues"
            desc="Discover and verify issues around you"
            color="border-l-green-500"
          />
          <QuickAction
            to="/my-reports"
            icon={ClipboardList}
            label="My Reports"
            desc="Track status of all your submissions"
            color="border-l-orange-500"
          />
        </div>
      </div>

      {/* ── Recent reports ───────────────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title">Recent Reports</h2>
          <Link to="/my-reports" className="text-sm text-primary-600 font-medium hover:underline inline-flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <MapPin size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium text-slate-500">No reports submitted yet</p>
            <p className="text-sm mb-4">Help improve your community by reporting civic issues.</p>
            <Link to="/report" className="btn-primary text-sm">
              <FilePlus size={14} /> Report First Issue
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((r) => (
              <ReportCard key={r._id} report={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;