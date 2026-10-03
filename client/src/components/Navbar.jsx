/**
 * Navbar.jsx
 * SRS §7.1: Landing page, Registration and login, Citizen dashboard, Authority dashboard.
 * Role-aware navigation: citizens see citizen links, authorities see portal link.
 */
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  MapPin, Menu, X, Bell, LogOut, User,
  LayoutDashboard, FilePlus, Map, ClipboardList, Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-primary-100 text-primary-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
      }`
    }
  >
    <Icon size={16} />
    {label}
  </NavLink>
);

const Navbar = () => {
  const { user, logout, isAuthority } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const citizenLinks = [
    { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/report',     icon: FilePlus,         label: 'Report Issue' },
    { to: '/nearby',     icon: Map,              label: 'Nearby Issues' },
    { to: '/my-reports', icon: ClipboardList,    label: 'My Reports' },
  ];

  const authorityLinks = [
    { to: '/authority',         icon: Shield,          label: 'Authority Portal' },
    { to: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/nearby',            icon: Map,             label: 'Map' },
  ];

  const links = isAuthority ? authorityLinks : citizenLinks;

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Brand */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-600 rounded-lg">
              <MapPin size={18} className="text-white" />
            </div>
            <span className="font-bold text-slate-800 text-lg">LocalPulse</span>
          </Link>

          {/* Desktop nav */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {links.map((l) => <NavItem key={l.to} {...l} />)}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Role chip */}
                <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isAuthority ? 'bg-purple-100 text-purple-700' : 'bg-primary-100 text-primary-700'
                }`}>
                  <User size={11} />
                  {isAuthority ? 'Authority' : 'Citizen'}
                </span>

                <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                  {user.name}
                </span>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut size={15} />
                  <span className="hidden sm:inline">Logout</span>
                </button>

                {/* Mobile hamburger */}
                <button
                  className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                  onClick={() => setMobileOpen((p) => !p)}
                >
                  {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary text-sm px-3 py-1.5">Login</Link>
                <Link to="/register" className="btn-primary text-sm px-3 py-1.5">Register</Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {user && mobileOpen && (
          <div className="md:hidden py-3 border-t border-slate-100 flex flex-col gap-1 pb-4">
            {links.map((l) => (
              <NavItem key={l.to} {...l} />
            ))}
            <div className="mt-2 pt-2 border-t border-slate-100">
              <p className="px-3 text-sm font-medium text-slate-700">{user.name}</p>
              <p className="px-3 text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
