/**
 * Report.jsx
 * SRS FR2:  Civic Issue Reporting
 * SRS FR3:  Image Upload
 * SRS FR4:  GPS and Location Capture
 * SRS FR5:  Google Maps Integration (OpenStreetMap iframe – no API key required)
 * SRS FR7:  AI-Assisted Issue Analysis (runs after submit, patches result back)
 * SRS FR8:  Duplicate Report Detection (via aiService client-side check)
 *
 * Flow (SRS §5.1 Citizen Reporting Workflow):
 *   Category → Description → Photo upload → GPS capture → Address confirm → Submit
 *   → AI analyse → patch AI result → redirect /my-reports
 *
 * Uses existing:
 *   reportAPI.create()     (multipart/form-data  POST /api/reports)
 *   reportAPI.saveAiResult() (PATCH /api/reports/:id/ai-analysis)
 *   aiAPI.analyse()        (POST /api/ai/analyse)
 *   analyseReport()        from aiService (client-side fallback)
 *   Spinner, SeverityBadge, CategoryBadge from existing components
 *   .btn-primary, .btn-secondary, .input, .label, .card classes from index.css
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Tag, AlignLeft, Camera, MapPin, Crosshair, CheckCircle,
  AlertTriangle, Copy, ArrowLeft, Send, X, RefreshCw,
  Info, ChevronDown, Sparkles, Building2, Search,
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';

import { reportAPI, aiAPI } from '../services/api';
import { analyseReport as localAnalyse } from '../services/aiService';
import { Spinner } from '../components/Loader';
import { SeverityBadge, CategoryBadge } from '../components/StatusBadge';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Roads and Infrastructure',
  'Electricity',
  'Water Supply',
  'Sanitation',
  'Public Facilities',
  'Other',
];

// Step numbers – used for the progress indicator
const STEPS = ['Category', 'Description', 'Photo', 'Location', 'Review'];

const reverseGeocode = async (latitude, longitude) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
    { headers: { 'Accept-Language': 'en' } }
  );
  if (!response.ok) throw new Error('Reverse geocoding failed');
  const data = await response.json();
  return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};

// ─── Small helper sub-components ─────────────────────────────────────────────

/** Step progress bar at the top of the form */
const StepIndicator = ({ current }) => (
  <div className="flex items-center gap-0 mb-8">
    {STEPS.map((label, idx) => {
      const done    = idx < current;
      const active  = idx === current;
      const isLast  = idx === STEPS.length - 1;
      return (
        <div key={label} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                done
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : active
                  ? 'border-primary-600 text-primary-600 bg-white'
                  : 'border-slate-300 text-slate-400 bg-white'
              }`}
            >
              {done ? <CheckCircle size={14} /> : idx + 1}
            </div>
            <span
              className={`text-xs mt-1 hidden sm:block font-medium ${
                active ? 'text-primary-600' : done ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {label}
            </span>
          </div>
          {!isLast && (
            <div
              className={`flex-1 h-0.5 mx-1 transition-all ${
                done ? 'bg-primary-600' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      );
    })}
  </div>
);

/** Image preview with remove button */
const ImagePreview = ({ file, onRemove }) => {
  const url = URL.createObjectURL(file);
  return (
    <div className="relative inline-block">
      <img
        src={url}
        alt="Issue evidence preview"
        className="w-full max-h-52 object-cover rounded-xl border border-slate-200"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-300 transition"
        aria-label="Remove image"
      >
        <X size={14} />
      </button>
      <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
        {(file.size / 1024 / 1024).toFixed(2)} MB
      </span>
    </div>
  );
};

/** OpenStreetMap embed – no API key required (SRS FR5 map confirmation) */
// ─── Clickable map location selector (SRS FR5) ─────────────────────────────

const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect?.(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
};

const MapLocationUpdater = ({ lat, lng }) => {
  const map = useMap();

  useEffect(() => {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (lat && lng && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      map.flyTo([latitude, longitude], Math.max(map.getZoom(), 16), { duration: 0.5 });
    }
  }, [lat, lng, map]);

  return null;
};

const MapPreview = ({
  lat,
  lng,
  address,
  onLocationSelect,
}) => {
  const defaultPosition = [20.5937, 78.9629];

  const hasPosition = lat !== '' && lng !== '' &&
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  const position = hasPosition
    ? [Number(lat), Number(lng)]
    : defaultPosition;

  return (
    <div className="mt-4">
      <div className="rounded-xl overflow-hidden border border-slate-200">
        <MapContainer
          center={position}
          zoom={lat && lng ? 16 : 5}
          style={{ height: '300px', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapLocationUpdater lat={lat} lng={lng} />
          <MapClickHandler
            onLocationSelect={onLocationSelect}
          />

          {hasPosition && (
            <Marker
              position={position}
              icon={L.divIcon({
                className: 'report-location-marker',
                html: '<span style="display:block;width:24px;height:24px;border:3px solid #fff;border-radius:50% 50% 50% 4px;background:#2563eb;box-shadow:0 2px 8px rgba(15,23,42,.4);transform:rotate(-45deg)"><span style="display:block;width:6px;height:6px;margin:6px;border-radius:50%;background:#fff"></span></span>',
                iconSize: [24, 24],
                iconAnchor: [12, 24],
              })}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-slate-500 mt-2">
        📍 Click on the map to select the exact location of the problem.
      </p>

      {hasPosition && (
        <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm">
          <p>
            <strong>Selected Location:</strong>{' '}
           {address || `Location: ${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`}
          </p>

          <p>
            <strong>Latitude:</strong>{' '}
            {parseFloat(lat).toFixed(6)}
          </p>

          <p>
            <strong>Longitude:</strong>{' '}
            {parseFloat(lng).toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
};

/** AI analysis result panel shown on the Review step */
const AiResultPanel = ({ analysis, loading }) => {
  if (loading) {
    return (
      <div className="card relative overflow-hidden border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-sky-50 p-5 sm:p-6">
        <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-indigo-200/30 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Sparkles size={21} />
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-sky-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-800">AI civic analysis</h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                <Sparkles size={11} /> AI powered
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Reviewing your report to help route it to the right team.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Spinner size="sm" />
              <p className="text-xs font-medium text-indigo-700">
                Evaluating category, severity, and possible duplicates…
              </p>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-indigo-100">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 to-sky-400" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="card overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-5 py-5 text-white sm:px-6">
        <div className="absolute -right-8 -top-16 h-40 w-40 rounded-full border border-white/10" />
        <div className="absolute -right-2 -top-10 h-28 w-28 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sky-300 ring-1 ring-white/15">
              <Sparkles size={21} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold tracking-wide">AI civic analysis</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-300/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-200 ring-1 ring-sky-200/20">
                  <Sparkles size={10} /> AI powered
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-300">Insights to support accurate civic response</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-300/20 sm:self-auto">
            <CheckCircle size={13} />
            Analysis complete
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <Tag size={13} /> Category
            </p>
            <div className="mt-2">
              <CategoryBadge category={analysis.category || 'Not specified'} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <AlertTriangle size={13} /> Severity
            </p>
            <div className="mt-2">
              <SeverityBadge severity={analysis.severity || 'medium'} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <Building2 size={13} /> Suggested department
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {analysis.suggestedDepartment || 'Not specified'}
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
              <Info size={15} />
            </span>
            Analysis summary
          </h4>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {analysis.summary || 'No additional summary is available for this report.'}
          </p>
        </section>

        <div className="space-y-3">
          {analysis.isDuplicate && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Copy size={16} />
              </span>
              <p className="text-sm leading-relaxed text-amber-900">
                <strong className="block font-semibold">Possible duplicate detected</strong>
                A similar issue was already reported nearby. Your report will still be saved and linked.
              </p>
            </div>
          )}

          {analysis.isSuspicious && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <AlertTriangle size={16} />
              </span>
              <p className="text-sm leading-relaxed text-red-900">
                <strong className="block font-semibold">Manual review recommended</strong>
                Suspicious content detected. {analysis.suspiciousReason}{' '}
                Your report will be flagged for manual review.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Report page ─────────────────────────────────────────────────────────
const Report = () => {
  const navigate = useNavigate();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [step,     setStep]     = useState(0);   // 0-4
  const [category, setCategory] = useState('');
  const [desc,     setDesc]     = useState('');
  const [imageFile,setImageFile]= useState(null); // File object
  const [lat,      setLat]      = useState('');
  const [lng,      setLng]      = useState('');
  const [address,  setAddress]  = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [locationSearchDone, setLocationSearchDone] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState('');

  // ── UI state ────────────────────────────────────────────────────────────────
  const [errors,       setErrors]       = useState({});
  const [gpsLoading,   setGpsLoading]   = useState(false);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiAnalysis,   setAiAnalysis]   = useState(null);
  const [submitting,   setSubmitting]   = useState(false);

  const fileInputRef = useRef(null);
  const locationSelectionRef = useRef(0);

  useEffect(() => {
    const query = locationQuery.trim();
    if (query.length < 3) {
      setLocationResults([]);
      setLocationSearchError('');
      setLocationSearchLoading(false);
      setLocationSearchDone(false);
      return undefined;
    }

    const controller = new AbortController();
    setLocationSearchDone(false);
    const timeoutId = setTimeout(async () => {
      setLocationSearchLoading(true);
      setLocationSearchError('');
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
          {
            headers: { 'Accept-Language': 'en' },
            signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error('Location search failed');
        const results = await response.json();
        setLocationResults(Array.isArray(results) ? results : []);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setLocationResults([]);
          setLocationSearchError('Could not search locations. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLocationSearchLoading(false);
          setLocationSearchDone(true);
        }
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [locationQuery]);

  // ─── Validation per step ───────────────────────────────────────────────────
  const validate = (targetStep) => {
    const e = {};
    if (targetStep >= 0 && !category)
      e.category = 'Please select an issue category.';
    if (targetStep >= 1) {
      if (!desc.trim())         e.desc = 'Description is required.';
      else if (desc.trim().length < 10) e.desc = 'Description must be at least 10 characters.';
      else if (desc.length > 2000)      e.desc = 'Description cannot exceed 2000 characters.';
    }
    if (targetStep >= 3) {
      if (!lat || !lng || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        e.location = 'Location is required. Search for a place, use your location, or select a map point.';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Step navigation ───────────────────────────────────────────────────────
  const goNext = () => {
    if (!validate(step)) return;
    // When moving to Review step (step 3 → 4), run AI analysis
    if (step === 3) {
      runAiAnalysis();
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  // ─── Image handling (SRS FR3) ──────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.');
      return;
    }
    setImageFile(file);
  };

  const removeImage = () => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── GPS capture (SRS FR4) ─────────────────────────────────────────────────
  const selectLocation = useCallback(async (latitude, longitude, selectedAddress = '') => {
    const selectionId = ++locationSelectionRef.current;
    const latitudeValue = String(latitude);
    const longitudeValue = String(longitude);
    setLat(latitudeValue);
    setLng(longitudeValue);
    setAddress(selectedAddress || `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`);
    setErrors((e) => ({ ...e, location: undefined }));

    if (selectedAddress) return;

    try {
      const detectedAddress = await reverseGeocode(Number(latitude), Number(longitude));
      if (locationSelectionRef.current === selectionId) setAddress(detectedAddress);
    } catch {
      if (locationSelectionRef.current === selectionId) {
        setAddress(`${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`);
      }
    }
  }, []);

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    const requestId = ++locationSelectionRef.current;
    setGpsLoading(true);
    setErrors((e) => ({ ...e, location: undefined }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (locationSelectionRef.current !== requestId) {
          setGpsLoading(false);
          return;
        }
        const { latitude, longitude } = pos.coords;
        selectLocation(latitude, longitude)
          .finally(() => setGpsLoading(false));

        toast.success('Location captured successfully.');
      },
      (err) => {
        setGpsLoading(false);
        if (locationSelectionRef.current !== requestId) return;
        const msgs = {
          1: 'Location permission denied. Please allow access in your browser settings.',
          2: 'Location unavailable. Check your device settings.',
          3: 'Location request timed out. Try again.',
        };
        toast.error(msgs[err.code] || 'Could not get location.');
        setErrors((e) => ({ ...e, location: msgs[err.code] || 'Location capture failed.' }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [selectLocation]);

  const clearLocation = () => {
    locationSelectionRef.current += 1;
    setLat(''); setLng(''); setAddress('');
    setErrors((e) => ({ ...e, location: undefined }));
    setLocationQuery('');
    setLocationResults([]);
  };
  // Select issue location by clicking on the map
  const handleMapLocationSelect = useCallback((latitude, longitude) => {
    selectLocation(latitude, longitude);
    toast.success('Problem location selected!');
  }, [selectLocation]);

  const handleSearchResultSelect = (result) => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    selectLocation(latitude, longitude, result.display_name || '');
    setLocationQuery('');
    setLocationResults([]);
    setLocationSearchError('');
  };

  // ─── AI analysis (SRS FR7) – runs just before Review step ─────────────────
  const runAiAnalysis = async () => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      // Try backend AI first; fall back to client-side mock
      try {
        const { data } = await aiAPI.analyse({ description: desc, category });
        setAiAnalysis(data.data);
      } catch {
        // Backend unreachable or returned error → use client-side mock (aiService.js)
        const result = await localAnalyse(desc, category);
        setAiAnalysis(result);
      }
    } catch {
      // silently skip if both fail – user can still submit
    } finally {
      setAiLoading(false);
    }
  };

  // ─── Final submission (SRS FR2) ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate(4)) return;

    setSubmitting(true);

    try {
      // Build multipart/form-data as expected by reportController.createReport
      const fd = new FormData();
      fd.append('category',    category);
      fd.append('description', desc.trim());
      fd.append('latitude',    lat);
      fd.append('longitude',   lng);
      fd.append('address',     address);
      if (imageFile) fd.append('image', imageFile);  // multer field name = 'image'

      const { data: createRes } = await reportAPI.create(fd);
      const reportId = createRes.data?._id;

      // Patch AI analysis result back to report if we have one (SRS FR7)
      if (reportId && aiAnalysis) {
        try {
          await reportAPI.saveAiResult(reportId, aiAnalysis);
        } catch {
          // Non-critical – report is already saved
        }
      }

      toast.success('Report submitted successfully! Redirecting to My Reports…');
      setTimeout(() => navigate('/my-reports'), 1200);
    } catch (err) {
      const msg = err.response?.data?.message || 'Submission failed. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render helpers ────────────────────────────────────────────────────────
  const charCount   = desc.length;
  const charMax     = 2000;
  const charWarning = charCount > charMax * 0.85;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/dashboard"
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Report a Civic Issue</h1>
            <p className="text-muted">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
          </div>
        </div>

        {/* ── Step indicator ───────────────────────────────────────────────── */}
        <StepIndicator current={step} />

        {/* ── Form card ───────────────────────────────────────────────────── */}
        <div className="card p-6 sm:p-8">

          {/* ════════════════════════════════════════════════════════════════
              STEP 0 – Category Selection (SRS FR2: issue category)
          ════════════════════════════════════════════════════════════════ */}
          {step === 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Tag size={18} className="text-primary-600" />
                <h2 className="section-title">What type of issue is this?</h2>
              </div>
              <p className="text-muted mb-6">
                Select the category that best describes the civic problem you've found.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      setErrors((e) => ({ ...e, category: undefined }));
                    }}
                    className={`text-left p-4 rounded-xl border-2 transition-all font-medium text-sm ${
                      category === cat
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      {cat}
                      {category === cat && (
                        <CheckCircle size={16} className="text-primary-600 shrink-0" />
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {errors.category && (
                <p className="text-red-500 text-xs mt-3 flex items-center gap-1">
                  <AlertTriangle size={12} /> {errors.category}
                </p>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 1 – Description (SRS FR2: issue description)
          ════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlignLeft size={18} className="text-primary-600" />
                <h2 className="section-title">Describe the issue</h2>
              </div>
              <p className="text-muted mb-6">
                Provide a clear, factual description. Include what the problem is,
                how long it has existed, and any immediate safety concern.
              </p>

              {/* Selected category chip reminder */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-slate-500">Category:</span>
                <CategoryBadge category={category} />
              </div>

              <label className="label" htmlFor="desc">
                Issue description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="desc"
                rows={6}
                className={`input resize-none ${errors.desc ? 'border-red-400 focus:ring-red-400' : ''}`}
                placeholder="e.g. There is a large pothole on Main Street near the bus stop. It has been there for about two weeks and is causing vehicles to swerve dangerously..."
                value={desc}
                onChange={(e) => {
                  setDesc(e.target.value);
                  setErrors((er) => ({ ...er, desc: undefined }));
                }}
                maxLength={charMax}
              />
              <div className="flex items-center justify-between mt-1.5">
                {errors.desc
                  ? <p className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={11} />{errors.desc}</p>
                  : <p className="text-xs text-slate-400">Minimum 10 characters.</p>
                }
                <p className={`text-xs shrink-0 ${charWarning ? 'text-orange-500 font-medium' : 'text-slate-400'}`}>
                  {charCount}/{charMax}
                </p>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 2 – Photo Upload (SRS FR3: Image Upload)
          ════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Camera size={18} className="text-primary-600" />
                <h2 className="section-title">Upload evidence photo</h2>
              </div>
              <p className="text-muted mb-6">
                A clear photograph speeds up verification. Accepted: JPG, PNG, WebP · Max 5 MB.
                This step is optional but strongly recommended.
              </p>

              {!imageFile ? (
                /* Drop zone / file picker */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload image"
                  className="border-2 border-dashed border-slate-300 hover:border-primary-400 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors hover:bg-primary-50 focus:outline-none focus:border-primary-500"
                >
                  <div className="p-3 bg-slate-100 rounded-full">
                    <Camera size={28} className="text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Click to upload a photo</p>
                  <p className="text-xs text-slate-400">JPG · PNG · WebP · up to 5 MB</p>
                  <span className="btn-secondary text-sm px-4 py-1.5 pointer-events-none">
                    Browse Files
                  </span>
                </div>
              ) : (
                <ImagePreview file={imageFile} onRemove={removeImage} />
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Image file input"
              />

              {imageFile && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 btn-secondary text-sm w-full"
                >
                  <RefreshCw size={13} /> Replace photo
                </button>
              )}

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2">
                <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">
                  You can skip this step and submit without a photo, but photographic
                  evidence significantly improves the chance of prompt resolution.
                </p>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 3 – GPS / Location (SRS FR4 + FR5)
          ════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={18} className="text-primary-600" />
                <h2 className="section-title">Confirm issue location</h2>
              </div>
              <p className="text-muted mb-6">
                Search for an address, use your current location, or click the map to place the pin.
              </p>

              <div className="relative z-10 mb-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder="Search location or address"
                    aria-label="Search location or address"
                    aria-autocomplete="list"
                    aria-expanded={locationResults.length > 0}
                    className="input w-full rounded-xl pl-10 shadow-sm"
                  />
                  {locationSearchLoading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      Searching…
                    </span>
                  )}
                  {locationResults.length > 0 && (
                    <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      {locationResults.map((result) => (
                        <li key={result.place_id}>
                          <button
                            type="button"
                            onClick={() => handleSearchResultSelect(result)}
                            className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <MapPin size={15} className="mt-0.5 shrink-0 text-primary-600" />
                            <span className="line-clamp-2">{result.display_name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {locationSearchError && (
                    <p role="alert" className="mt-1 text-xs text-red-600">{locationSearchError}</p>
                  )}
                  {locationSearchDone && !locationSearchError && locationResults.length === 0 && (
                    <p className="mt-1 text-xs text-slate-500">No matching places found.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={captureLocation}
                  disabled={gpsLoading}
                  className="btn-secondary shrink-0 whitespace-nowrap"
                >
                  {gpsLoading ? <Spinner size="sm" /> : <Crosshair size={15} />}
                  Use my location
                </button>
              </div>

              {/* Interactive map — click to select the exact problem location */}
              <MapPreview
                lat={lat}
                lng={lng}
                address={address}
                onLocationSelect={handleMapLocationSelect}
              />

{/* Current GPS location option */}
<div className="mt-4 space-y-3">
  {!lat || !lng ? (
    <button
      type="button"
      onClick={captureLocation}
      disabled={gpsLoading}
      className="btn-primary w-full py-3 text-base"
    >
      {gpsLoading ? (
        <>
          <Spinner size="sm" color="white" />
          Detecting location…
        </>
      ) : (
        <>
          <Crosshair size={16} />
          Get My Current Location
        </>
      )}
    </button>
  ) : (
    <>
      <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
        <CheckCircle
          size={18}
          className="text-green-600 shrink-0 mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-800">
            Problem location selected
          </p>

          {address && (
            <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
              {address}
            </p>
          )}

          <p className="text-xs text-green-600 mt-1 font-mono">
            {parseFloat(lat).toFixed(6)},{" "}
            {parseFloat(lng).toFixed(6)}
          </p>
        </div>

        <button
          type="button"
          onClick={clearLocation}
          className="shrink-0 p-1.5 text-green-600 hover:text-red-500 hover:bg-red-50 rounded-lg"
          aria-label="Clear location"
        >
          <X size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={captureLocation}
        disabled={gpsLoading}
        className="btn-secondary w-full text-sm"
      >
        {gpsLoading ? (
          <>
            <Spinner size="sm" />
            Detecting…
          </>
        ) : (
          <>
            <RefreshCw size={13} />
            Use My Current Location
          </>
        )}
      </button>
    </>
  )}
</div>

              {/* Manual override */}
              {!lat && !gpsLoading && (
                <details className="mt-4">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 flex items-center gap-1">
                    <ChevronDown size={12} /> Enter coordinates manually
                  </summary>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs" htmlFor="manLat">Latitude</label>
                      <input
                        id="manLat"
                        type="number"
                        step="any"
                        placeholder="e.g. 17.3850"
                        className="input text-sm"
                        value={lat}
                        onChange={(e) => {
                          locationSelectionRef.current += 1;
                          setLat(e.target.value);
                          setErrors((er) => ({ ...er, location: undefined }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="label text-xs" htmlFor="manLng">Longitude</label>
                      <input
                        id="manLng"
                        type="number"
                        step="any"
                        placeholder="e.g. 78.4867"
                        className="input text-sm"
                        value={lng}
                        onChange={(e) => {
                          locationSelectionRef.current += 1;
                          setLng(e.target.value);
                          setErrors((er) => ({ ...er, location: undefined }));
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label text-xs" htmlFor="manAddr">Address / Landmark (optional)</label>
                      <input
                        id="manAddr"
                        type="text"
                        placeholder="e.g. Near Central Park, MG Road"
                        className="input text-sm"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </details>
              )}

              {errors.location && (
                <p className="text-red-500 text-xs mt-3 flex items-center gap-1">
                  <AlertTriangle size={12} /> {errors.location}
                </p>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 4 – Review & Submit
          ════════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Send size={18} className="text-primary-600" />
                <h2 className="section-title">Review &amp; Submit</h2>
              </div>
              <p className="text-muted">
                Check your report details below. Once submitted it will be reviewed
                by local authority officers.
              </p>

              {/* ── Summary table ─────────────────────────────────────────── */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">

                <div className="flex gap-3 px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500 w-28 shrink-0 pt-0.5">Category</span>
                  <CategoryBadge category={category} />
                </div>

                <div className="flex gap-3 px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500 w-28 shrink-0 pt-0.5">Description</span>
                  <p className="text-sm text-slate-700 leading-relaxed">{desc}</p>
                </div>

                <div className="flex gap-3 px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500 w-28 shrink-0 pt-0.5">Photo</span>
                  {imageFile
                    ? <span className="text-sm text-green-700 font-medium flex items-center gap-1">
                        <CheckCircle size={14} /> {imageFile.name}
                      </span>
                    : <span className="text-sm text-slate-400">No photo attached</span>
                  }
                </div>

                <div className="flex gap-3 px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500 w-28 shrink-0 pt-0.5">Location</span>
                  <div className="text-sm text-slate-700">
                    <p className="leading-relaxed mb-0.5">
                      {address || (
                        lat && lng
                          ? `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`
                          : 'Address not available'
                      )}
                    </p>
                    <p className="font-mono text-xs text-slate-500">
                      {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Map on review step */}
              <MapPreview lat={lat} lng={lng} />

              {/* AI analysis panel */}
              <AiResultPanel analysis={aiAnalysis} loading={aiLoading} />

              {/* Submit button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || aiLoading}
                className="btn-primary w-full py-3 text-base"
              >
                {submitting
                  ? <><Spinner size="sm" color="white" /> Submitting report…</>
                  : <><Send size={16} /> Submit Report</>
                }
              </button>

              <p className="text-xs text-slate-400 text-center">
                By submitting you confirm this is a genuine civic issue in your locality.
              </p>
            </div>
          )}

          {/* ── Step navigation buttons ──────────────────────────────────── */}
          {step < 4 && (
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0}
                className="btn-secondary"
              >
                <ArrowLeft size={15} /> Back
              </button>

              <button
                type="button"
                onClick={goNext}
                className="btn-primary"
              >
                {step === 3 ? 'Review Report' : 'Continue'}
                {step < 3 && <span className="ml-1">→</span>}
              </button>
            </div>
          )}

          {/* Back button on review step */}
          {step === 4 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="btn-secondary w-full"
              >
                <ArrowLeft size={15} /> Edit Report
              </button>
            </div>
          )}
        </div>

        {/* ── Help tip below card ──────────────────────────────────────── */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Need help?{' '}
          <span className="text-primary-600 cursor-pointer hover:underline">
            Open the AI assistant (💬 bottom-right) for guidance.
          </span>
        </p>
      </div>
    </div>
  );
};

export default Report;
