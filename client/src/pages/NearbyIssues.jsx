import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';

import 'leaflet/dist/leaflet.css';
import { reportAPI } from '../services/api';
import { CategoryBadge, SeverityBadge, StatusBadge } from '../components/StatusBadge';

const DEFAULT_RADIUS = 5000;

const MapRecenter = ({ position, focusKey }) => {
  const map = useMap();

  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [focusKey, map, position]);

  return null;
};

const getReportCoordinates = (report) => {
  const coordinates = report.location?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const [longitude, latitude] = coordinates.map(Number);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return [latitude, longitude];
    }
  }

  const latitude = Number(report.latitude);
  const longitude = Number(report.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? [latitude, longitude]
    : null;
};

const getMarkerColor = (report) => {
  switch (String(report.aiAnalysis?.severity || '').toLowerCase()) {
    case 'critical':
    case 'high':
      return '#dc2626';
    case 'medium':
      return '#f97316';
    case 'low':
      return '#16a34a';
    default:
      return '#64748b';
  }
};

const createMarkerIcon = (color) =>
  L.divIcon({
    className: 'nearby-issue-marker',
    html: `<span style="display:block;width:28px;height:28px;border:3px solid #fff;border-radius:50% 50% 50% 4px;background:${color};box-shadow:0 3px 10px rgba(15,23,42,.35);transform:rotate(-45deg)"><span style="display:block;width:6px;height:6px;margin:8px;border-radius:50%;background:#fff"></span></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

const userLocationIcon = L.divIcon({
  className: 'nearby-user-marker',
  html: '<span style="display:block;width:22px;height:22px;border:3px solid #fff;border-radius:50%;background:#2563eb;box-shadow:0 0 0 8px rgba(37,99,235,.18),0 2px 8px rgba(15,23,42,.35)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const formatLocation = (report) => {
  if (report.address) return report.address;
  if (report.location?.name) return report.location.name;
  const coordinates = getReportCoordinates(report);
  if (coordinates) return `${coordinates[0].toFixed(4)}, ${coordinates[1].toFixed(4)}`;
  if (typeof report.latitude === 'number' && typeof report.longitude === 'number') {
    return `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`;
  }
  return 'Location unavailable';
};

const NearbyIssues = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [locationInfo, setLocationInfo] = useState('');
  const [userPosition, setUserPosition] = useState(null);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [apiError, setApiError] = useState('');
  const [locationFocus, setLocationFocus] = useState(0);

  const fetchNearby = async (lat, lng, radius = DEFAULT_RADIUS) => {
    setLoading(true);
    setLocationError('');
    setApiError('');
    setSelectedReport(null);

    try {
      const { data } = await reportAPI.getNearby(lat, lng, radius);
      setReports(data?.data || []);
      setLocationInfo(`Showing issues within ${Math.round(radius / 1000)} km of your location.`);
    } catch (error) {
      console.error(error);
      toast.error('Could not load nearby issues');
      setReports([]);
      setApiError('Nearby issues could not be loaded. Check your connection and try again.');
      setLocationInfo('');
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported on this browser.');
      setLoading(false);
      setReports([]);
      return;
    }

    setLoading(true);
    setLocationError('');
    setApiError('');
    setLocationInfo('Fetching your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserPosition([latitude, longitude]);
        fetchNearby(latitude, longitude, radius);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location access was denied. Please allow location access to view nearby public issues.'
            : 'Unable to get your location. Please try again.';

        setLocationError(message);
        setReports([]);
        setLoading(false);
        setLocationInfo('');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 600000,
      }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const filteredReports = reports.filter((report) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [
      report.title,
      report.description,
      report.category,
      report.status,
      report.address,
      report.location?.name,
    ].some((value) => String(value || '').toLowerCase().includes(query));
  });

  const refreshNearby = () => {
    if (userPosition) fetchNearby(userPosition[0], userPosition[1], radius);
    else requestLocation();
  };

  const changeRadius = (event) => {
    const nextRadius = Number(event.target.value);
    setRadius(nextRadius);
    if (userPosition) fetchNearby(userPosition[0], userPosition[1], nextRadius);
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="relative h-[78vh] min-h-[560px] overflow-hidden bg-slate-200 sm:h-[calc(100vh-2rem)]">
        {userPosition && (
          <MapContainer
            key={userPosition.join(',')}
            center={userPosition}
            zoom={13}
            zoomControl={false}
            scrollWheelZoom
            className="z-0 h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoomControl position="bottomright" />
            <MapRecenter position={userPosition} focusKey={locationFocus} />
            <Marker position={userPosition} icon={userLocationIcon}>
              <Popup><span className="font-medium">Your location</span></Popup>
            </Marker>
            {filteredReports.map((report) => {
              const position = getReportCoordinates(report);
              if (!position) return null;

              const title = report.title || report.description || 'Community issue';
              const description = report.description && report.title && report.description !== report.title
                ? report.description
                : report.description || 'No description provided';
              const severity = report.aiAnalysis?.severity || 'Not specified';

              return (
                <Marker
                  key={report._id}
                  position={position}
                  icon={createMarkerIcon(getMarkerColor(report))}
                  eventHandlers={{ click: () => setSelectedReport(report) }}
                >
                  <Popup>
                    <div className="min-w-52 space-y-1.5 text-sm">
                      <h3 className="font-semibold text-slate-800">{title}</h3>
                      <p className="text-slate-600">{description}</p>
                      <p><strong>Category:</strong> {report.category || 'General'}</p>
                      <p><strong>Severity:</strong> {severity}</p>
                      <p><strong>Status:</strong> {report.status?.replaceAll('_', ' ') || 'Not specified'}</p>
                      <p><strong>Address:</strong> {formatLocation(report)}</p>
                      <p><strong>Reported:</strong> {formatDate(report.createdAt)}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3 sm:p-6">
          <div className="pointer-events-auto mx-auto flex max-w-5xl flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white p-2 shadow-lg shadow-slate-900/10 sm:flex-nowrap sm:gap-3 sm:p-3">
            <Link
              to="/dashboard"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-primary-600"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="flex min-w-[140px] flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3">
              <Search size={17} className="shrink-0 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search nearby issues"
                aria-label="Search nearby issues"
                className="h-10 w-full min-w-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
            <label className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-600">
              <span className="sr-only">Search radius</span>
              <MapPin size={16} className="text-slate-500" />
              <select
                value={radius}
                onChange={changeRadius}
                className="max-w-[86px] bg-transparent font-medium outline-none sm:max-w-none"
                aria-label="Search radius"
              >
                {[1000, 2000, 5000, 10000, 25000].map((value) => (
                  <option key={value} value={value}>{value >= 1000 ? `${value / 1000} km` : `${value} m`}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                if (userPosition) {
                  setLocationFocus((focus) => focus + 1);
                } else {
                  requestLocation();
                }
              }}
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              aria-label="My Location"
              title="My Location"
            >
              <LocateFixed size={17} className="text-blue-600" />
              <span className="hidden sm:inline">My Location</span>
            </button>
            <button
              type="button"
              onClick={refreshNearby}
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:gap-2 sm:px-4"
              aria-label="Refresh nearby issues"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          <div className="pointer-events-auto mx-auto mt-3 flex max-w-5xl items-center justify-between gap-3">
            <Link
              to="/dashboard"
              className="hidden items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-sm font-medium text-slate-700 shadow-md sm:inline-flex"
            >
              LocalPulse
            </Link>
            <div className="ml-auto rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-sm font-semibold text-slate-700 shadow-md">
              {reports.length} {reports.length === 1 ? 'issue' : 'issues'} nearby
            </div>
          </div>
        </div>

        {loading && (
          <div className="absolute left-1/2 top-1/2 z-[900] w-[min(90%,360px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white bg-white/95 p-5 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-blue-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {userPosition ? 'Updating nearby issues…' : 'Finding your location…'}
            </p>
          </div>
        )}

        {!loading && locationError && (
          <div className="absolute left-1/2 top-1/2 z-[900] w-[min(90%,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-red-100 bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <ShieldAlert size={24} />
            </div>
            <h1 className="text-lg font-semibold text-slate-800">Location access is needed</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{locationError}</p>
            <p className="mt-2 text-xs text-slate-400">You can enable location permission in your browser settings and retry.</p>
            <button type="button" onClick={requestLocation} className="btn-primary mt-4">
              Try Again
            </button>
          </div>
        )}

        {!loading && !locationError && apiError && (
          <div className="absolute left-1/2 top-1/2 z-[900] w-[min(90%,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-amber-100 bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertTriangle size={23} />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Couldn’t load nearby issues</h2>
            <p className="mt-2 text-sm text-slate-500">{apiError}</p>
            <button type="button" onClick={refreshNearby} className="btn-primary mt-4">
              Try Again
            </button>
          </div>
        )}

        {!loading && !locationError && !apiError && reports.length === 0 && userPosition && (
          <div className="absolute left-1/2 top-1/2 z-[800] w-[min(90%,380px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white bg-white/95 p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <MapPin size={22} />
            </div>
            <h2 className="font-semibold text-slate-800">No nearby issues yet</h2>
            <p className="mt-1 text-sm text-slate-500">
              No public reports were found within {radius / 1000} km. Try a wider search radius.
            </p>
          </div>
        )}

        {!loading && !apiError && reports.length > 0 && filteredReports.length === 0 && (
          <div className="absolute left-1/2 top-1/2 z-[800] w-[min(90%,340px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/95 p-5 text-center shadow-xl">
            <Search size={21} className="mx-auto mb-2 text-slate-400" />
            <p className="font-medium text-slate-700">No issues match “{searchQuery}”</p>
            <button type="button" onClick={() => setSearchQuery('')} className="mt-2 text-sm font-medium text-primary-600">
              Clear search
            </button>
          </div>
        )}

        {selectedReport && (
          <article className="absolute inset-x-3 bottom-4 z-[800] mx-auto max-w-md rounded-2xl border border-white bg-white p-4 shadow-xl sm:bottom-6 sm:left-6 sm:right-auto sm:mx-0 sm:w-80">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category={selectedReport.category || 'General'} />
                  {selectedReport.aiAnalysis?.severity && <SeverityBadge severity={selectedReport.aiAnalysis.severity} />}
                </div>
                <h2 className="font-semibold leading-snug text-slate-800">
                  {selectedReport.title || selectedReport.description || 'Community issue'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close selected issue"
              >
                <X size={17} />
              </button>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">
              {selectedReport.description || 'No description provided'}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
              <span className="inline-flex min-w-0 items-center gap-1 truncate">
                <MapPin size={13} className="shrink-0" />
                {formatLocation(selectedReport)}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1">
                <Check size={13} />
                {selectedReport.status?.replaceAll('_', ' ') || 'Not specified'}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Reported {formatDate(selectedReport.createdAt)}</p>
          </article>
        )}

        {userPosition && (
          <div className="absolute right-3 top-44 z-[700] hidden items-center gap-3 rounded-xl border border-white bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-md sm:right-6 sm:top-36 sm:flex">
            {[
              ['High', '#dc2626'],
              ['Medium', '#f97316'],
              ['Low', '#16a34a'],
            ].map(([label, color]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        )}
      </section>

      {locationInfo && !locationError && (
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 text-sm text-slate-500 sm:px-6">
          <LocateFixed size={15} />
          <span>{locationInfo}</span>
        </div>
      )}

      {!loading && !apiError && reports.length > 0 && (
        <section className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Nearby public reports</h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredReports.length} shown of {reports.length} reports
              </p>
            </div>
            <button type="button" onClick={requestLocation} className="btn-secondary shrink-0">
              <RefreshCw size={15} />
              Refresh location
            </button>
          </div>
          {filteredReports.map((report) => {
                const title = report.title || report.description || 'Community issue';
                const description = report.description && report.title && report.description !== report.title
                  ? report.description
                  : report.description || 'No description provided';

                return (
                  <article
                    key={report._id}
                    className="card p-5 border-l-4 border-l-primary-500 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <CategoryBadge category={report.category || 'General'} />
                          {report.aiAnalysis?.severity && (
                            <SeverityBadge severity={report.aiAnalysis.severity} />
                          )}
                          <StatusBadge status={report.status} />
                        </div>

                        <h2 className="text-xl font-bold text-slate-800 break-words">{title}</h2>
                        <p className="mt-2 text-slate-600 leading-relaxed">{description}</p>
                      </div>

                      <div className="text-sm text-slate-500 whitespace-nowrap md:text-right">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(report.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Category</p>
                        <p className="mt-1 font-semibold text-slate-800">{report.category || 'General'}</p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Severity</p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {report.aiAnalysis?.severity || 'Not specified'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Department</p>
                        <p className="mt-1 flex items-center gap-2 font-semibold text-slate-800">
                          <Building2 size={14} className="text-slate-500" />
                          {report.department || report.assignedDepartment || 'Not specified'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Location</p>
                        <p className="mt-1 flex items-start gap-2 font-semibold text-slate-800">
                          <MapPin size={14} className="mt-0.5 text-slate-500" />
                          <span className="break-words">{formatLocation(report)}</span>
                        </p>
                      </div>
                    </div>

                    {report.aiAnalysis?.isSuspicious && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        <AlertTriangle size={14} />
                        AI flagged this report for manual review.
                      </div>
                    )}
                  </article>
                );
          })}
        </section>
      )}
    </main>
  );
};

export default NearbyIssues;
