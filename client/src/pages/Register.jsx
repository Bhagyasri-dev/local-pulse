/**
 * Register.jsx – SRS FR1: User Registration and Authentication
 * SRS §2.3.1 Primary User: Citizen
 * SRS §2.3.2 Authority User (role selectable for demo)
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, User, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Loader';
import toast from 'react-hot-toast';

const Register = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Full name is required';
    if (!form.email)          e.email   = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password)       e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Minimum 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, password: form.password, role: 'citizen' };
      await register(payload);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-xl">

          {/* Brand */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-2 bg-primary-600 rounded-xl">
              <MapPin size={22} className="text-white" />
            </div>
            <span className="font-bold text-2xl text-slate-800">LocalPulse</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-1 text-center">Create your account</h1>
          <p className="text-muted text-center mb-8">Join the civic community</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Name */}
            <div>
              <label className="label">Full name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Your full name" className={`input pl-9 ${errors.name ? 'border-red-400' : ''}`}
                  value={form.name} onChange={set('name')} disabled={loading} />
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" placeholder="you@example.com" className={`input pl-9 ${errors.email ? 'border-red-400' : ''}`}
                  value={form.email} onChange={set('email')} disabled={loading} />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} placeholder="Min. 6 characters"
                  className={`input pl-9 pr-10 ${errors.password ? 'border-red-400' : ''}`}
                  value={form.password} onChange={set('password')} disabled={loading} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPw((p) => !p)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label className="label">Confirm password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} placeholder="Repeat password"
                  className={`input pl-9 ${errors.confirmPassword ? 'border-red-400' : ''}`}
                  value={form.confirmPassword} onChange={set('confirmPassword')} disabled={loading} />
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 text-base" disabled={loading}>
              {loading ? <><Spinner size="sm" color="white" /> Creating account…</> : <><UserPlus size={16} /> Create Account</>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
