import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  FileCode2,
  GitCommit,
  BookmarkCheck,
  GitPullRequest,
  RotateCcw,
  AlertTriangle,
  Terminal,
  ArrowUpRight,
  Clock,
  Sparkles,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area
} from 'recharts';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const { addToast } = useToast();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      addToast(err.message, 'error', 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await api.seedDemo();
      addToast('E-Commerce Platform demo project seeded with real Fossil check-ins!', 'success', 'Demo Initialized');
      fetchDashboardData();
    } catch (err) {
      addToast(err.message, 'error', 'Seed Failed');
    } finally {
      setSeeding(false);
    }
  };

  const kpis = stats?.kpis;
  const charts = stats?.charts;

  const COLORS = ['#D69A4A', '#4FA7A0', '#72B37E', '#D6A84F', '#D96B63', '#8AA4B0'];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Hero */}
      <div className="rounded-2xl bg-archival-surface border border-archival-border p-6 shadow-xl flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2 text-xs font-mono text-archival-accent">
            <Clock className="w-4 h-4" />
            <span>CONFIGURATION TIME MACHINE CONSOLE</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-archival-text">
            Baseline & Evolution Management Overview
          </h1>
          <p className="text-xs text-archival-muted max-w-2xl leading-relaxed">
            Every configuration has a history. Every change is traceable. Every stable state can become a baseline. Fossil SCM engine provides real versioning and auditability.
          </p>
        </div>

        <div className="flex items-center gap-2.5 z-10">
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-lg bg-archival-elevated hover:bg-archival-border border border-archival-border text-archival-muted hover:text-archival-text transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="px-3.5 py-2 rounded-lg bg-archival-accent hover:bg-archival-accent-hover text-archival-bg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-archival-accent/20 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{seeding ? 'Seeding Demo SCM...' : 'Seed E-Commerce Demo'}</span>
          </button>
        </div>
      </div>

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="p-4 rounded-xl bg-archival-surface border border-archival-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-archival-muted">
            <span className="text-xs font-mono uppercase tracking-wider">Total Projects</span>
            <FolderGit2 className="w-4 h-4 text-archival-accent" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-archival-text">{kpis?.totalProjects || 0}</span>
            <Link to="/projects" className="text-[11px] font-mono text-archival-accent hover:underline flex items-center gap-0.5">
              View <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Configuration Items */}
        <div className="p-4 rounded-xl bg-archival-surface border border-archival-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-archival-muted">
            <span className="text-xs font-mono uppercase tracking-wider">Config Items</span>
            <FileCode2 className="w-4 h-4 text-archival-teal" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-archival-text">{kpis?.totalItems || 0}</span>
            <Link to="/configurations" className="text-[11px] font-mono text-archival-teal hover:underline flex items-center gap-0.5">
              Files <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Total Revisions */}
        <div className="p-4 rounded-xl bg-archival-surface border border-archival-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-archival-muted">
            <span className="text-xs font-mono uppercase tracking-wider">Fossil Revisions</span>
            <GitCommit className="w-4 h-4 text-archival-accent" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-archival-text">{kpis?.totalRevisions || 0}</span>
            <Link to="/time-machine" className="text-[11px] font-mono text-archival-accent hover:underline flex items-center gap-0.5">
              Timeline <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Active Baselines */}
        <div className="p-4 rounded-xl bg-archival-surface border border-archival-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-archival-muted">
            <span className="text-xs font-mono uppercase tracking-wider">Active Baselines</span>
            <BookmarkCheck className="w-4 h-4 text-archival-warning" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-archival-text">{kpis?.activeBaselines || 0}</span>
            <Link to="/baselines" className="text-[11px] font-mono text-archival-warning hover:underline flex items-center gap-0.5">
              Baselines <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Changes This Week */}
        <div className="p-4 rounded-xl bg-archival-surface border border-archival-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-archival-muted">
            <span className="text-xs font-mono uppercase tracking-wider">Change Requests</span>
            <GitPullRequest className="w-4 h-4 text-archival-success" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-archival-text">{kpis?.changesThisWeek || 0}</span>
            <Link to="/changes" className="text-[11px] font-mono text-archival-success hover:underline flex items-center gap-0.5">
              CRs <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Safe Rollbacks */}
        <div className="p-4 rounded-xl bg-archival-surface border border-archival-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-archival-muted">
            <span className="text-xs font-mono uppercase tracking-wider">SCM Rollbacks</span>
            <RotateCcw className="w-4 h-4 text-archival-danger" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-archival-text">{kpis?.totalRollbacks || 0}</span>
            <Link to="/rollback" className="text-[11px] font-mono text-archival-danger hover:underline flex items-center gap-0.5">
              Rollback <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Configuration Drift */}
        <div className="p-4 rounded-xl bg-archival-surface border border-archival-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-archival-muted">
            <span className="text-xs font-mono uppercase tracking-wider">Config Drift</span>
            <AlertTriangle className="w-4 h-4 text-archival-warning" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-archival-text">
              {kpis?.configurationDrift || 0}
            </span>
            <span className="text-[11px] font-mono text-archival-muted">monitored</span>
          </div>
        </div>

        {/* SCM Engine Status */}
        <div className="p-4 rounded-xl bg-archival-surface border border-archival-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-archival-muted">
            <span className="text-xs font-mono uppercase tracking-wider">SCM Engine</span>
            <Terminal className="w-4 h-4 text-archival-teal" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${kpis?.fossilStatus?.connected ? 'bg-archival-success' : 'bg-archival-danger'}`} />
              <span className="text-sm font-semibold font-mono text-archival-text">
                {kpis?.fossilStatus?.connected ? 'Fossil SCM' : 'Offline'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-archival-muted">v{kpis?.fossilStatus?.version || '2.28'}</span>
          </div>
        </div>
      </div>

      {/* Real SCM Visualizations Grid (6 Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Evolution Timeline (Last 10 checkins) */}
        <div className="rounded-xl bg-archival-surface border border-archival-border p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-archival-border">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-archival-accent font-semibold">
                Configuration Evolution Timeline
              </h3>
              <p className="text-xs text-archival-muted mt-0.5">Most recent Fossil check-ins across repositories</p>
            </div>
            <Link to="/time-machine" className="text-xs font-mono text-archival-teal hover:underline flex items-center gap-1">
              Time Machine <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto max-h-72">
            {charts?.evolutionTimeline?.length > 0 ? (
              charts.evolutionTimeline.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-archival-elevated/60 border border-archival-border/60 hover:border-archival-accent/40 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-archival-accent/20 border border-archival-accent/40 flex items-center justify-center text-archival-accent shrink-0 mt-0.5">
                    <GitCommit className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-archival-text truncate">{item.message}</span>
                      <span className="text-[10px] font-mono text-archival-muted shrink-0">{item.date} {item.time}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-archival-muted">
                      <span className="text-archival-accent">[{item.revision?.substring(0, 8)}]</span>
                      <span>by {item.author}</span>
                      <span>•</span>
                      <span className="text-archival-teal">{item.projectName}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-archival-muted font-mono">
                No evolution check-ins recorded yet. Click "Seed E-Commerce Demo" above.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Revisions Over Time */}
        <div className="rounded-xl bg-archival-surface border border-archival-border p-5 shadow-lg flex flex-col">
          <div className="pb-3 border-b border-archival-border">
            <h3 className="text-xs font-mono uppercase tracking-wider text-archival-accent font-semibold">
              Revisions Over Time
            </h3>
            <p className="text-xs text-archival-muted mt-0.5">Check-in velocity and commit frequency</p>
          </div>
          <div className="h-64 mt-4 w-full">
            {charts?.revisionsOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.revisionsOverTime}>
                  <XAxis dataKey="date" stroke="#A9B0AD" fontSize={10} tickLine={false} />
                  <YAxis stroke="#A9B0AD" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#20282A',
                      borderColor: '#30393A',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="revisions" fill="#D69A4A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-archival-muted font-mono">
                Awaiting revision metrics...
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Change Activity by Status */}
        <div className="rounded-xl bg-archival-surface border border-archival-border p-5 shadow-lg flex flex-col">
          <div className="pb-3 border-b border-archival-border">
            <h3 className="text-xs font-mono uppercase tracking-wider text-archival-teal font-semibold">
              Change Request Lifecycle
            </h3>
            <p className="text-xs text-archival-muted mt-0.5">Distribution of changes by current state</p>
          </div>
          <div className="h-64 mt-4 w-full flex items-center justify-center">
            {charts?.changesByStatus?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.changesByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {charts.changesByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#20282A',
                      borderColor: '#30393A',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-archival-muted font-mono">No change records found.</div>
            )}
          </div>
        </div>

        {/* Chart 4: Baseline Distribution */}
        <div className="rounded-xl bg-archival-surface border border-archival-border p-5 shadow-lg flex flex-col">
          <div className="pb-3 border-b border-archival-border">
            <h3 className="text-xs font-mono uppercase tracking-wider text-archival-warning font-semibold">
              Baseline Status Distribution
            </h3>
            <p className="text-xs text-archival-muted mt-0.5">Active, Approved, Superseded, and Archived baselines</p>
          </div>
          <div className="h-64 mt-4 w-full">
            {charts?.baselineDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.baselineDistribution}>
                  <XAxis dataKey="status" stroke="#A9B0AD" fontSize={10} tickLine={false} />
                  <YAxis stroke="#A9B0AD" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#20282A',
                      borderColor: '#30393A',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" fill="#4FA7A0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-archival-muted font-mono">
                No baselines established yet.
              </div>
            )}
          </div>
        </div>

        {/* Chart 5: Configuration by File Type */}
        <div className="rounded-xl bg-archival-surface border border-archival-border p-5 shadow-lg flex flex-col">
          <div className="pb-3 border-b border-archival-border">
            <h3 className="text-xs font-mono uppercase tracking-wider text-archival-accent font-semibold">
              Configuration Items by Type
            </h3>
            <p className="text-xs text-archival-muted mt-0.5">Tracked formats: YAML, JSON, Nginx conf, Dockerfile</p>
          </div>
          <div className="h-64 mt-4 w-full">
            {charts?.configByType?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.configByType}>
                  <XAxis dataKey="file_type" stroke="#A9B0AD" fontSize={10} tickLine={false} />
                  <YAxis stroke="#A9B0AD" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#20282A',
                      borderColor: '#30393A',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" fill="#72B37E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-archival-muted font-mono">
                No configuration items recorded.
              </div>
            )}
          </div>
        </div>

        {/* Chart 6: Rollback Activity */}
        <div className="rounded-xl bg-archival-surface border border-archival-border p-5 shadow-lg flex flex-col">
          <div className="pb-3 border-b border-archival-border">
            <h3 className="text-xs font-mono uppercase tracking-wider text-archival-danger font-semibold">
              Rollback Audit Log Activity
            </h3>
            <p className="text-xs text-archival-muted mt-0.5">Audited configuration rollback incidents</p>
          </div>
          <div className="h-64 mt-4 w-full">
            {charts?.rollbackLogs?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.rollbackLogs}>
                  <XAxis dataKey="date" stroke="#A9B0AD" fontSize={10} tickLine={false} />
                  <YAxis stroke="#A9B0AD" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#20282A',
                      borderColor: '#30393A',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#D96B63" fill="#D96B63" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-archival-muted font-mono">
                Zero rollbacks logged — system is stable.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
