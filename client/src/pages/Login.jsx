import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ShieldCheck, Terminal, ArrowRight, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      addToast(`Welcome back, ${username}! SCM console authenticated.`, 'success', 'Session Initialized');
      navigate('/');
    } catch (err) {
      addToast(err.message, 'error', 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setUsername('admin');
    setPassword('admin123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-archival-bg px-4 select-none relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full border border-archival-border/40 pointer-events-none opacity-40 animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full border border-archival-border/40 pointer-events-none opacity-40" />

      <div className="w-full max-w-md rounded-2xl bg-archival-surface border border-archival-border shadow-2xl p-8 relative z-10">
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-archival-elevated border border-archival-accent/40 flex items-center justify-center text-archival-accent shadow-inner mb-4">
            <History className="w-8 h-8 animate-spin" style={{ animationDuration: '24s' }} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-archival-text">
            Software Configuration Time Machine
          </h1>
          <p className="text-xs text-archival-muted font-mono mt-1 uppercase tracking-wider">
            Baseline & Evolution Management System
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-archival-teal" /> Username or Email
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or daksh"
              className="w-full px-3.5 py-2.5 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-archival-accent" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text focus:outline-none focus:border-archival-accent transition-all font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-archival-accent hover:bg-archival-accent-hover text-archival-bg font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-archival-accent/20 mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Enter SCM Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials Fill Button */}
        <div className="mt-6 pt-6 border-t border-archival-border flex items-center justify-between text-xs">
          <span className="text-archival-muted font-mono">Academic Demo Access:</span>
          <button
            type="button"
            onClick={handleDemoFill}
            className="px-2.5 py-1 rounded bg-archival-elevated hover:bg-archival-border border border-archival-border text-archival-accent font-mono text-[11px] transition-colors"
          >
            Fill Demo Credentials
          </button>
        </div>

        {/* Fossil SCM Badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-mono text-archival-muted">
          <Terminal className="w-3.5 h-3.5 text-archival-teal" />
          <span>Fossil SCM Version Engine Integrated</span>
        </div>
      </div>
    </div>
  );
}
