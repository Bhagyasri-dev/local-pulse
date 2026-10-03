import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  MapPin,
  Calendar,
  AlertCircle,
  ArrowLeft,
  FilePlus,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { reportAPI } from '../services/api';
import { ReportCard } from '../components/Card';
import { CardSkeleton } from '../components/Loader';

const MyReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data } = await reportAPI.getMyReports();
        setReports(data.data || []);
      } catch (error) {
        console.error(error);
        toast.error('Could not load your reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/dashboard"
              className="text-slate-500 hover:text-primary-600"
            >
              <ArrowLeft size={18} />
            </Link>

            <h1 className="text-2xl font-bold text-slate-800">
              My Reports
            </h1>
          </div>

          <p className="text-slate-500">
            Track the status of all your submitted civic issues.
          </p>
        </div>

        <Link to="/report" className="btn-primary">
          <FilePlus size={16} />
          Report New Issue
        </Link>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : reports.length === 0 ? (

        /* Empty state */
        <div className="card p-10 text-center">
          <ClipboardList
            size={48}
            className="mx-auto mb-4 text-slate-300"
          />

          <h2 className="text-lg font-semibold text-slate-700">
            No reports yet
          </h2>

          <p className="text-sm text-slate-500 mt-1 mb-5">
            You have not submitted any civic issues yet.
          </p>

          <Link to="/report" className="btn-primary">
            <FilePlus size={16} />
            Report Your First Issue
          </Link>
        </div>

      ) : (

        /* Reports */
        <div className="space-y-4">

          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <ClipboardList size={16} />
            <span>
              {reports.length} report{reports.length !== 1 ? 's' : ''}
            </span>
          </div>

          {reports
            .sort(
              (a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            )
            .map((report) => (
              <ReportCard
                key={report._id}
                report={report}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default MyReports;