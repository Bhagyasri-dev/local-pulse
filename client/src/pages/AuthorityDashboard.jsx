import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { authorityAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  'submitted',
  'under_review',
  'verified',
  'assigned',
  'in_progress',
  'resolved',
];

const AuthorityDashboard = () => {
  const { user, logout, isAuthority } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    try {
      setLoading(true);

      const { data } = await authorityAPI.getReports({
        page: 1,
        limit: 50,
      });

      setReports(data.data || []);
    } catch (error) {
      toast.error('Could not load authority reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthority) {
      navigate('/dashboard', { replace: true });
      return;
    }

    loadReports();
  }, [isAuthority]);

  const updateStatus = async (id, status) => {
    try {
      await authorityAPI.updateStatus(id, { status });

      toast.success('Status updated successfully');

      loadReports();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Could not update status'
      );
    }
  };

  const assignDepartment = async (id) => {
    const department = window.prompt(
      'Enter department:\n\nRoads and Infrastructure\nElectricity\nWater Supply\nSanitation\nPublic Facilities\nOther'
    );

    if (!department) return;

    try {
      await authorityAPI.assign(id, {
        department,
      });

      toast.success('Department assigned successfully');

      loadReports();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Could not assign department'
      );
    }
  };

  const resolveReport = async (id) => {
    const notes = window.prompt('Enter resolution notes:');

    if (!notes) return;

    try {
      const formData = new FormData();

      formData.append('resolutionNotes', notes);

      await authorityAPI.resolve(id, formData);

      toast.success('Report resolved successfully');

      loadReports();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Could not resolve report'
      );
    }
  };

  const submitted = reports.filter(
    (r) => r.status === 'submitted'
  ).length;

  const inProgress = reports.filter(
    (r) => r.status === 'in_progress'
  ).length;

  const resolved = reports.filter(
    (r) => r.status === 'resolved'
  ).length;

  if (!isAuthority) return null;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">

          <div>
            <h1 className="text-xl font-bold text-slate-800">
              LocalPulse Authority Portal
            </h1>

            <p className="text-sm text-slate-500">
              Welcome, {user?.name}
            </p>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <LogOut size={16} />
            Logout
          </button>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Title */}
        <div className="flex items-center justify-between">

          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Civic Issue Reports
            </h2>

            <p className="text-slate-500 mt-1">
              Review, assign and manage citizen reports.
            </p>
          </div>

          <button
            onClick={loadReports}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <div className="bg-white rounded-xl border p-5">
            <FileText className="text-blue-600 mb-3" size={24} />
            <p className="text-2xl font-bold">
              {reports.length}
            </p>
            <p className="text-sm text-slate-500">
              Total Reports
            </p>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <Clock className="text-orange-500 mb-3" size={24} />
            <p className="text-2xl font-bold">
              {submitted}
            </p>
            <p className="text-sm text-slate-500">
              Submitted
            </p>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <AlertCircle className="text-purple-500 mb-3" size={24} />
            <p className="text-2xl font-bold">
              {inProgress}
            </p>
            <p className="text-sm text-slate-500">
              In Progress
            </p>
          </div>

          <div className="bg-white rounded-xl border p-5">
            <CheckCircle className="text-green-600 mb-3" size={24} />
            <p className="text-2xl font-bold">
              {resolved}
            </p>
            <p className="text-sm text-slate-500">
              Resolved
            </p>
          </div>

        </div>

        {/* Reports */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

          <div className="px-6 py-4 border-b bg-slate-50">
            <h3 className="font-semibold text-slate-800">
              Citizen Reports
            </h3>
          </div>

          {loading ? (

            <div className="p-10 text-center text-slate-500">
              Loading reports...
            </div>

          ) : reports.length === 0 ? (

            <div className="p-10 text-center text-slate-500">
              No reports available.
            </div>

          ) : (

            <div className="divide-y">

              {reports.map((report) => (

                <div
                  key={report._id}
                  className="p-6 space-y-4"
                >

                  {/* Report header */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">

                    <div>

                      <h4 className="font-semibold text-slate-800">
                        {report.description || 'Civic Issue'}
                      </h4>

                      <p className="text-sm text-slate-500 mt-1">
                        Category: {report.category || 'N/A'}
                      </p>

                      <p className="text-sm text-slate-500">
                        Location:{' '}
                        {report.address || report.location?.name || 'Address not available'}
                      </p>

                    </div>

                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                      {report.status?.replace('_', ' ').toUpperCase()}
                    </span>

                  </div>

                  {/* AI analysis */}
                  {report.aiAnalysis && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">

                      <p className="text-sm font-semibold text-yellow-800">
                        AI Analysis
                      </p>

                      <p className="text-sm text-yellow-700 mt-1">
                        Severity:{' '}
                        {report.aiAnalysis.severity || 'N/A'}
                      </p>

                      {report.aiAnalysis.isSuspicious && (
                        <p className="text-sm text-red-600 font-medium mt-1">
                          ⚠ Flagged as suspicious
                        </p>
                      )}

                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">

                    <select
                      value={report.status || 'submitted'}
                      onChange={(e) =>
                        updateStatus(
                          report._id,
                          e.target.value
                        )
                      }
                      className="border rounded-lg px-3 py-2 text-sm"
                    >

                      {STATUS_OPTIONS.map((status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status
                            .replace('_', ' ')
                            .replace(/\b\w/g, (c) =>
                              c.toUpperCase()
                            )}
                        </option>
                      ))}

                    </select>

                    <button
                      onClick={() =>
                        assignDepartment(report._id)
                      }
                      className="px-4 py-2 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium"
                    >
                      Assign Department
                    </button>

                    {report.status !== 'resolved' && (
                      <button
                        onClick={() =>
                          resolveReport(report._id)
                        }
                        className="px-4 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium"
                      >
                        Resolve
                      </button>
                    )}

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </main>
    </div>
  );
};

export default AuthorityDashboard;