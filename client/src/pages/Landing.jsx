/**
 * Landing.jsx
 * Public-facing marketing page describing LocalPulse platform.
 */
import { Link } from 'react-router-dom';
import {
  MapPin, Camera, Brain, Shield, Users, CheckCircle,
  ArrowRight, Zap, Eye, TrendingUp,
} from 'lucide-react';

const Feature = ({ icon: Icon, title, desc, color }) => (
  <div className="card p-6 hover:shadow-md transition-shadow">
    <div className={`inline-flex p-3 rounded-xl mb-4 ${color}`}>
      <Icon size={24} />
    </div>
    <h3 className="font-semibold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
  </div>
);

const Step = ({ num, title, desc }) => (
  <div className="flex gap-4">
    <div className="shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
      {num}
    </div>
    <div className="pt-1">
      <h4 className="font-semibold text-slate-800">{title}</h4>
      <p className="text-slate-500 text-sm mt-1 leading-relaxed">{desc}</p>
    </div>
  </div>
);

const Stat = ({ value, label }) => (
  <div className="text-center">
    <p className="text-4xl font-extrabold text-white">{value}</p>
    <p className="text-primary-200 text-sm mt-1">{label}</p>
  </div>
);

const Landing = () => (
  <div className="min-h-screen bg-white">

    {/* ── Hero ──────────────────────────────────────────────────────────────── */}
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
      {/* Background circles */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-primary-800/40 rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6 py-20 sm:py-28">
        <div className="max-w-2xl">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 bg-primary-500/30 border border-primary-400/30 text-primary-100 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Zap size={12} /> AI-Assisted Civic Platform
          </span>

          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">
            Report Civic Issues.<br />
            <span className="text-primary-200">Get Them Resolved.</span>
          </h1>
          <p className="text-primary-100 text-lg leading-relaxed mb-8">
            LocalPulse connects citizens with local authorities through AI-verified,
            geo-tagged civic issue reports — from potholes to power outages.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-6 py-3 rounded-xl hover:bg-primary-50 transition-colors shadow-lg">
              Get Started Free <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 border border-primary-400/50 text-white font-medium px-6 py-3 rounded-xl hover:bg-primary-700 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* ── Stats ─────────────────────────────────────────────────────────────── */}
    <section className="bg-primary-600">
      <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <Stat value="🔒" label="Secure Auth" />
        <Stat value="🧠" label="AI Analysis" />
        <Stat value="🏛️" label="Authority Portal" />
        <Stat value="📍" label="Status Tracking" />
      </div>
    </section>

    {/* ── Features ──────────────────────────────────────────────────────────── */}
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center mb-14">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">Everything you need to improve your community</h2>
        <p className="text-slate-500 max-w-xl mx-auto">
          From reporting to resolution — LocalPulse covers the entire civic issue lifecycle with AI assistance.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Feature
          icon={Camera}
          color="bg-blue-100 text-blue-600"
          title="Photo Evidence"
          desc="Attach photographs to your reports. Visual evidence strengthens cases and helps authorities verify issues faster."
        />
        <Feature
          icon={MapPin}
          color="bg-green-100 text-green-600"
          title="GPS Location"
          desc="GPS auto-capture pins the exact issue location. Google Maps visualization helps discover nearby problems."
        />
        <Feature
          icon={Brain}
          color="bg-purple-100 text-purple-600"
          title="AI Analysis"
          desc="Our AI classifies issue severity, detects duplicates, flags suspicious reports, and suggests responsible departments."
        />
        <Feature
          icon={Users}
          color="bg-orange-100 text-orange-600"
          title="Community Verification"
          desc="Nearby citizens can confirm issues, giving authorities stronger evidence and reducing false reports."
        />
        <Feature
          icon={Shield}
          color="bg-red-100 text-red-600"
          title="Authority Portal"
          desc="Dedicated dashboard for officials to review, assign, update status, and record resolution with evidence."
        />
        <Feature
          icon={Eye}
          color="bg-teal-100 text-teal-600"
          title="Status Tracking"
          desc="Citizens follow every report from Submitted → Under Review → Verified → Assigned → In Progress → Resolved."
        />
      </div>
    </section>

    {/* ── How it works ──────────────────────────────────────────────────────── */}
    <section className="bg-slate-50 py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">How LocalPulse Works</h2>
          <p className="text-slate-500">A structured platform connecting citizens, AI, and civic authorities.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-10">
          <div className="space-y-8">
            <Step num="1" title="Register & Login" desc="Create a citizen account in seconds. Secure JWT-based authentication." />
            <Step num="2" title="Report the Issue" desc="Select category, write description, upload photo, and confirm GPS location on map." />
            <Step num="3" title="AI Analyses" desc="Our AI classifies severity, checks duplicates, and flags suspicious content automatically." />
          </div>
          <div className="space-y-8">
            <Step num="4" title="Community Confirms" desc="Nearby citizens verify the report to strengthen credibility." />
            <Step num="5" title="Authority Reviews" desc="Officials verify, assign to the correct department, and start work." />
            <Step num="6" title="Track to Resolution" desc="Citizens see live status updates all the way to Resolved with evidence." />
          </div>
        </div>
      </div>
    </section>

    {/* ── CTA ───────────────────────────────────────────────────────────────── */}
    <section className="bg-primary-600 py-16">
      <div className="max-w-2xl mx-auto text-center px-6">
        <TrendingUp size={40} className="text-primary-200 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-white mb-4">Start improving your community today</h2>
        <p className="text-primary-200 mb-8">Join LocalPulse — free, no credit card required.</p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-3 rounded-xl hover:bg-primary-50 transition-colors shadow-xl"
        >
          Create Free Account <ArrowRight size={16} />
        </Link>
      </div>
    </section>

    {/* ── Footer ────────────────────────────────────────────────────────────── */}
    <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="p-1 bg-primary-600 rounded">
          <MapPin size={12} className="text-white" />
        </div>
        <span className="font-semibold text-white">LocalPulse</span>
      </div>
      <p>AI-Assisted Civic Issue Reporting &amp; Verification Platform</p>
    </footer>
  </div>
);

export default Landing;