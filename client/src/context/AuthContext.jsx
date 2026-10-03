/**
 * AuthContext.jsx
 * SRS FR1: User Registration and Authentication
 * Stores JWT token + user in localStorage for persistence.
 * Exposes: user, token, login(), register(), logout(), loading
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true); // initialising

  // ── Restore session from localStorage ──────────────────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('lp_token');
    const savedUser  = localStorage.getItem('lp_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('lp_token');
        localStorage.removeItem('lp_user');
      }
    }
    setLoading(false);
  }, []);

  // ── Persist helpers ─────────────────────────────────────────────────────────
  const persist = (tkn, usr) => {
    localStorage.setItem('lp_token', tkn);
    localStorage.setItem('lp_user', JSON.stringify(usr));
    setToken(tkn);
    setUser(usr);
  };

  // ── Register ────────────────────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    const { data } = await authAPI.register(formData);
    persist(data.token, data.user);
    toast.success(`Welcome to LocalPulse, ${data.user.name}!`);
    return data.user;
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (formData) => {
    const { data } = await authAPI.login(formData);
    persist(data.token, data.user);
    toast.success(`Welcome back, ${data.user.name}!`);
    return data.user;
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('lp_token');
    localStorage.removeItem('lp_user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const isAuthority = user?.role === 'authority' || user?.role === 'admin';
  const isAdmin     = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthority, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
