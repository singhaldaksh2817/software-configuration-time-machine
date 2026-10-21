import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  History,
  LayoutDashboard,
  FolderGit2,
  FileCode2,
  BookmarkCheck,
  GitCompare,
  RotateCcw,
  GitPullRequest,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Server,
  Box,
  User,
  LogOut,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [fossilStatus, setFossilStatus] = useState(null);
  const [jenkinsStatus, setJenkinsStatus] = useState(null);
  const [dockerStatus, setDockerStatus] = useState(null);
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const fetchStatuses = async () => {
      try {
        const [fossil, jenkins, docker] = await Promise.all([
          api.getFossilStatus().catch(() => ({ connected: false })),
          api.getJenkinsStatus().catch(() => ({ connected: false })),
          api.getDockerStatus().catch(() => ({ connected: false }))
        ]);
        if (mounted) {
          setFossilStatus(fossil);
          setJenkinsStatus(jenkins);
          setDockerStatus(docker);
        }
      } catch (e) {
        // Ignore
      }
    };
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 20000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderGit2 },
    { name: 'Time Machine', path: '/time-machine', icon: Clock, highlight: true },
    { name: 'Configurations', path: '/configurations', icon: FileCode2 },
    { name: 'Baselines', path: '/baselines', icon: BookmarkCheck },
    { name: 'Changes', path: '/changes', icon: GitPullRequest },
    { name: 'Compare', path: '/compare', icon: GitCompare },
    { name: 'Rollback', path: '/rollback', icon: RotateCcw },
    { name: 'Audit Trail', path: '/audit', icon: ShieldCheck },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-archival-surface border-r border-archival-border transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-archival-border bg-archival-surface">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-archival-elevated border border-archival-accent/30 flex items-center justify-center text-archival-accent shrink-0 shadow-inner">
            <History className="w-6 h-6 animate-pulse" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm tracking-wide text-archival-text truncate">
                TIME MACHINE
              </span>
              <span className="text-[10px] text-archival-muted uppercase tracking-wider truncate font-mono">
                SCM Archival System
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-archival-elevated text-archival-muted hover:text-archival-text transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-archival-accent/15 text-archival-accent border border-archival-accent/40 font-semibold shadow-sm'
                  : 'text-archival-muted hover:text-archival-text hover:bg-archival-elevated/70'
              } ${item.highlight && !isActive ? 'hover:border-archival-accent/30' : ''}`}
              title={collapsed ? item.name : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-archival-accent' : item.highlight ? 'text-archival-accent/80' : ''}`} />
              {!collapsed && (
                <span className="truncate flex-1">{item.name}</span>
              )}
              {!collapsed && item.highlight && (
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono bg-archival-accent/20 text-archival-accent border border-archival-accent/30">
                  SCM
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* System Status Indicators */}
      {!collapsed ? (
        <div className="p-3 border-t border-archival-border bg-archival-surface/80 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-archival-muted px-1 flex items-center justify-between">
            <span>Engine Connectors</span>
            <span className="w-1.5 h-1.5 rounded-full bg-archival-accent animate-ping" />
          </div>

          {/* Fossil SCM Status */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-archival-elevated/60 text-xs border border-archival-border/60">
            <div className="flex items-center gap-2 text-archival-text">
              <Terminal className="w-3.5 h-3.5 text-archival-teal" />
              <span className="font-mono text-[11px]">Fossil SCM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  fossilStatus?.connected ? 'bg-archival-success' : 'bg-archival-danger'
                }`}
              />
              <span className="text-[10px] text-archival-muted font-mono">
                {fossilStatus?.connected ? `v${fossilStatus.version || '2.28'}` : 'Offline'}
              </span>
            </div>
          </div>

          {/* Jenkins CI/CD Status */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-archival-elevated/60 text-xs border border-archival-border/60">
            <div className="flex items-center gap-2 text-archival-text">
              <Server className="w-3.5 h-3.5 text-archival-accent" />
              <span className="font-mono text-[11px]">Jenkins CI</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  jenkinsStatus?.connected ? 'bg-archival-success' : 'bg-archival-warning'
                }`}
              />
              <span className="text-[10px] text-archival-muted font-mono">
                {jenkinsStatus?.connected ? 'Online' : 'Pipeline'}
              </span>
            </div>
          </div>

          {/* Docker Status */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-archival-elevated/60 text-xs border border-archival-border/60">
            <div className="flex items-center gap-2 text-archival-text">
              <Box className="w-3.5 h-3.5 text-archival-teal" />
              <span className="font-mono text-[11px]">Docker</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-archival-success" />
              <span className="text-[10px] text-archival-muted font-mono">Ready</span>
            </div>
          </div>

          {/* User Profile */}
          <div className="pt-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-archival-accent/20 border border-archival-accent/40 flex items-center justify-center text-archival-accent shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-archival-text truncate">{user?.fullName || 'Daksh (SCM)'}</span>
                <span className="text-[10px] text-archival-muted truncate font-mono">{user?.role || 'Admin'}</span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1 rounded text-archival-muted hover:text-archival-danger transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-archival-border flex flex-col items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full ${
              fossilStatus?.connected ? 'bg-archival-success' : 'bg-archival-danger'
            }`}
            title={`Fossil: ${fossilStatus?.connected ? 'Connected' : 'Offline'}`}
          />
          <button
            onClick={logout}
            title="Logout"
            className="p-1 text-archival-muted hover:text-archival-danger"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
