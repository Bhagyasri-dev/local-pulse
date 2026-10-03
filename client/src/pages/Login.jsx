/**
 * Login.jsx – SRS FR1: User Registration and Authentication
 * SRS NFR2: Authentication information shall be protected.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Loader';
import toast from 'react-hot-toast';

const Login = () => {
  const { login, logout } = useAuth();
  const navigate  = useNavigate();

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(form);
      if (user.role !== 'citizen') {
        logout();
        toast.error('Please use Authority Login for this account.');
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoFill = () => setForm({ email: 'citizen@demo.com', password: 'demo123' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="card p-8 shadow-xl">
          {/* Brand */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-2 bg-primary-600 rounded-xl">
              <MapPin size={22} className="text-white" />
            </div>
            <span className="font-bold text-2xl text-slate-800">LocalPulse</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-1 text-center">Welcome back</h1>
          <p className="text-muted text-center mb-8">Sign in to your account</p>

          {/* Citizen demo credentials */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6">
            <p className="text-xs font-semibold text-blue-700 mb-2">Quick demo fill:</p>
            <div>
              <button onClick={demoFill} className="w-full text-xs bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 transition">
                Citizen Demo
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={`input pl-9 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={loading}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input pl-9 pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPw((p) => !p)}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 text-base" disabled={loading}>
              {loading ? <><Spinner size="sm" color="white" /> Signing in…</> : <><LogIn size={16} /> Sign In</>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">Create one</Link>
          </p>
          <p className="text-center text-xs text-slate-400 mt-4">
            Civic team member?{' '}
            <Link to="/authority-login" className="font-medium text-slate-600 hover:text-primary-600 hover:underline">
              Authority Login
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          LocalPulse · AI-Assisted Civic Issue Reporting Platform
        </p>
      </div>
    </div>
  );
};

export default Login;
