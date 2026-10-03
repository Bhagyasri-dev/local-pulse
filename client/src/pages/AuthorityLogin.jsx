import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Mail, Lock, Eye, EyeOff, LogIn, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Loader';
import toast from 'react-hot-toast';

const AuthorityLogin = () => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const nextErrors = {};
    if (!form.email) nextErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = 'Enter a valid email';
    if (!form.password) nextErrors.password = 'Password is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const user = await login(form);
      if (user.role !== 'authority' && user.role !== 'admin') {
        logout();
        toast.error('This account does not have authority access.');
        return;
      }
      navigate('/authority', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-xl">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-2 bg-primary-600 rounded-xl">
              <MapPin size={22} className="text-white" />
            </div>
            <span className="font-bold text-2xl text-slate-800">LocalPulse</span>
          </div>

          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Shield size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Authority Login</h1>
            <p className="text-muted">Sign in to the authority workspace</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={`input pl-9 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  disabled={loading}
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input pl-9 pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPw((current) => !current)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
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
            Resident?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Citizen Login</Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          LocalPulse · Authority workspace
        </p>
      </div>
    </div>
  );
};

export default AuthorityLogin;
