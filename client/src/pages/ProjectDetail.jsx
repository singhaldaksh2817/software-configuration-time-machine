import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  FolderGit2,
  FileCode2,
  Clock,
  BookmarkCheck,
  GitPullRequest,
  GitCompare,
  RotateCcw,
  ShieldCheck,
  Plus,
  RefreshCw,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Trash2,
  Eye,
  ArrowRight,
  User,
  Calendar,
  Layers,
  Sparkles,
  Rocket,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import DiffViewer from '../components/diff/DiffViewer';
import TimeMachineScrubber from '../components/timeline/TimeMachineScrubber';
import NewConfigurationModal from '../components/modals/NewConfigurationModal';
import NewBaselineModal from '../components/modals/NewBaselineModal';
import NewChangeModal from '../components/modals/NewChangeModal';
import RollbackModal from '../components/modals/RollbackModal';
import ComplianceModal from '../components/modals/ComplianceModal';

export default function ProjectDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const { addToast } = useToast();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab Data States
  const [configurations, setConfigurations] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [baselines, setBaselines] = useState([]);
  const [changes, setChanges] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [driftReport, setDriftReport] = useState(null);

  // Modals & Active Selections
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingConfigItem, setEditingConfigItem] = useState(null);
  const [viewingConfigContent, setViewingConfigContent] = useState(null);

  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);

  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);
  const [rollbackTargetRevision, setRollbackTargetRevision] = useState(null);

  // Compare Tab States
  const [compareMode, setCompareMode] = useState('revisions'); // 'revisions' | 'baseline_vs_current' | 'baselines'
  const [compareRefA, setCompareRefA] = useState('');
  const [compareRefB, setCompareRefB] = useState('');
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);

  // Selected Revision in TimeMachine
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const handleSyncWorkspace = async () => {
    try {
      setSyncing(true);
      const res = await api.syncWorkspace(id);
      addToast(`Workspace synchronized: ${res.totalFiles} files detected (${res.newlyAdded} newly tracked)`, 'success', 'Workspace Sync Complete');
      fetchProjectData();
    } catch (err) {
      addToast(err.message, 'error', 'Sync Failed');
    } finally {
      setSyncing(false);
    }
  };

  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
  const [healingDrift, setHealingDrift] = useState(false);
  const [scanningDrift, setScanningDrift] = useState(false);
  const [jenkinsTriggering, setJenkinsTriggering] = useState(false);

  const handleScanDrift = async () => {
    try {
      setScanningDrift(true);
      const res = await api.getDrift(id);
      setDriftReport(res);
      if (res?.status === 'DRIFT_DETECTED') {
        addToast(`Drift scan complete: ${res.summary.driftCount} configuration item(s) drifted from baseline!`, 'warning', '⚠ Drift Detected');
      } else {
        addToast('Drift scan complete: All items strictly match baseline.', 'success', '✔ In Sync');
      }
    } catch (err) {
      addToast(err.message, 'error', 'Drift Scan Failed');
    } finally {
      setScanningDrift(false);
    }
  };

  const handleAutoHeal = async () => {
    try {
      setHealingDrift(true);
      const res = await api.autoHealDrift(id, driftReport?.baseline?.id, 'AutoHealer');
      if (res.healed) {
        addToast(`Self-healed ${res.driftedFiles.length} file(s) back to baseline [${res.baselineCode}]`, 'success', '⚡ Auto-Heal Complete');
      } else {
        addToast(res.message, 'info');
      }
      fetchProjectData();
    } catch (err) {
      addToast(err.message, 'error', 'Auto-Heal Failed');
    } finally {
      setHealingDrift(false);
    }
  };

  const handleTriggerJenkins = async () => {
    try {
      setJenkinsTriggering(true);
      const res = await api.triggerJenkinsBuild('Software Configuration Time Machine');
      if (res.success) {
        addToast('Jenkins pipeline execution triggered!', 'success', '🚀 Jenkins CI/CD Started');
      } else {
        // Jenkins security active — open pipeline directly in new tab with user's active session!
        const targetUrl = res.jobUrl || 'http://localhost:8080/job/Software%20Configuration%20Time%20Machine';
        window.open(targetUrl, '_blank');
        addToast('Opening Jenkins pipeline console in a new tab (authenticated session).', 'info', 'Jenkins Pipeline');
      }
    } catch (err) {
      window.open('http://localhost:8080/job/Software%20Configuration%20Time%20Machine', '_blank');
      addToast('Opening Jenkins directly in a new tab...', 'info');
    } finally {
      setJenkinsTriggering(false);
    }
  };

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const proj = await api.getProject(id);
      setProject(proj);

      // Concurrently fetch tab datasets
      const [configs, tline, blines, chgs, audits, drift] = await Promise.all([
        api.getConfigurations(id).catch(() => []),
        api.getTimeline(id, 50).catch(() => []),
        api.getBaselines(id).catch(() => []),
        api.getChanges(id).catch(() => []),
        api.getAuditLogs({ projectId: id }).catch(() => []),
        api.getDrift(id).catch(() => null)
      ]);

      setConfigurations(configs);
      setTimeline(tline);
      setBaselines(blines);
      setChanges(chgs);
      setAuditLogs(audits);
      setDriftReport(drift);

      if (tline.length > 0 && !selectedRevision) {
        setSelectedRevision(tline[0]);
      }
    } catch (err) {
      addToast(err.message, 'error', 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  // Execute Comparison
  const handleRunCompare = async (overrideA = null, overrideB = null, overrideType = null) => {
    const refA = overrideA || compareRefA;
    const refB = overrideB || compareRefB;
    const type = overrideType || compareMode;

    if (!refA) {
      addToast('Please select a reference state for comparison', 'warning');
      return;
    }

    setComparing(true);
    try {
      const res = await api.compare(id, { refA, refB, type });
      setCompareResult(res);
    } catch (err) {
      addToast(err.message, 'error', 'Comparison Failed');
    } finally {
      setComparing(false);
    }
  };

  // Quick action to compare revision with its parent
  const handleCompareRevision = (rev) => {
    setTab('compare');
    setCompareMode('revisions');
    setCompareRefA(rev.revision);
    setCompareRefB(project?.current_revision || 'HEAD');
    handleRunCompare(rev.revision, project?.current_revision || 'HEAD', 'revisions');
  };

  // Quick action to trigger rollback to a revision
  const handleTriggerRollback = (rev) => {
    setRollbackTargetRevision(rev.revision);
    setIsRollbackModalOpen(true);
  };

  // Configuration Item View Content
  const handleViewConfig = async (item) => {
    try {
      const contentRes = await api.getConfigurationContent(id, item.id);
      setViewingConfigContent(contentRes);
    } catch (err) {
      addToast(err.message, 'error', 'Failed to load content');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FolderGit2 },
    { id: 'configurations', label: 'Configurations', icon: FileCode2, count: configurations.length },
    { id: 'timeline', label: 'Timeline', icon: Clock, count: timeline.length },
    { id: 'baselines', label: 'Baselines', icon: BookmarkCheck, count: baselines.length },
    { id: 'drift', label: 'Drift Detection', icon: AlertTriangle, count: driftReport?.summary?.driftCount || 0 },
    { id: 'changes', label: 'Changes', icon: GitPullRequest, count: changes.length },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'rollback', label: 'Rollback', icon: RotateCcw },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck, count: auditLogs.length }
  ];

  if (loading && !project) {
    return (
      <div className="p-12 text-center text-xs font-mono text-archival-muted">
        Loading SCM Project Workspace...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center text-sm font-medium text-archival-text">
        Project not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Project Workspace Header */}
      <div className="rounded-2xl bg-archival-surface border border-archival-border p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-archival-elevated border border-archival-accent/40 flex items-center justify-center text-archival-accent shadow-inner">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-archival-text">
                    {project.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-archival-success/15 border border-archival-success/30 text-archival-success">
                    {project.status}
                  </span>
                  {driftReport && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border flex items-center gap-1 ${
                        driftReport.status === 'DRIFT_DETECTED'
                          ? 'bg-archival-warning/15 border-archival-warning/40 text-archival-warning'
                          : 'bg-archival-teal/15 border-archival-teal/40 text-archival-teal'
                      }`}
                    >
                      {driftReport.status === 'DRIFT_DETECTED' ? (
                        <>
                          <AlertTriangle className="w-3 h-3" />
                          <span>Drift Detected ({driftReport.summary.driftCount} files)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>In Sync with Baseline</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
                <p className="text-xs text-archival-muted mt-1 leading-relaxed max-w-2xl">
                  {project.description || 'Software configuration repository managed with Fossil SCM.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsComplianceModalOpen(true)}
              className="px-3 py-2 rounded-lg bg-archival-surface hover:bg-archival-elevated border border-archival-border text-archival-text font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              title="Generate and download audit compliance certificate"
            >
              <ShieldCheck className="w-4 h-4 text-archival-teal" />
              <span>Compliance Report</span>
            </button>

            <button
              onClick={handleTriggerJenkins}
              disabled={jenkinsTriggering}
              className="px-3 py-2 rounded-lg bg-archival-surface hover:bg-archival-elevated border border-archival-border text-archival-text font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              title="Trigger Jenkins Declarative CI/CD Pipeline"
            >
              <Rocket className={`w-4 h-4 text-archival-warning ${jenkinsTriggering ? 'animate-bounce' : ''}`} />
              <span>{jenkinsTriggering ? 'Starting Pipeline...' : 'Run CI/CD (Jenkins)'}</span>
            </button>

            <button
              onClick={fetchProjectData}
              className="p-2 rounded-lg bg-archival-elevated hover:bg-archival-border border border-archival-border text-archival-muted hover:text-archival-text transition-colors"
              title="Refresh SCM Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                setEditingConfigItem(null);
                setIsConfigModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-archival-accent hover:bg-archival-accent-hover text-archival-bg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-archival-accent/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Config File</span>
            </button>
          </div>
        </div>

        {/* Project Metadata Ribbon */}
        <div className="mt-5 pt-4 border-t border-archival-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-archival-muted block text-[10px] uppercase">Active Revision</span>
            <span className="text-archival-accent font-semibold">[{project.current_revision?.substring(0, 10) || 'HEAD'}]</span>
          </div>
          <div>
            <span className="text-archival-muted block text-[10px] uppercase">Current Baseline</span>
            <span className="text-archival-warning font-semibold">{project.current_baseline || 'None Defined'}</span>
          </div>
          <div>
            <span className="text-archival-muted block text-[10px] uppercase">Repository Location</span>
            <span className="text-archival-text truncate block" title={project.repository_path}>
              {project.repository_path ? project.repository_path.split(/[\/\\]/).slice(-2).join('/') : 'Local .fossil'}
            </span>
          </div>
          <div>
            <span className="text-archival-muted block text-[10px] uppercase">SCM Engine</span>
            <span className="text-archival-teal font-medium">Fossil 2.28 Connected</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex overflow-x-auto border-b border-archival-border bg-archival-surface/60 rounded-xl p-1 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-archival-accent text-archival-bg font-semibold shadow-sm'
                  : 'text-archival-muted hover:text-archival-text hover:bg-archival-elevated'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-archival-bg text-archival-text'
                      : 'bg-archival-elevated text-archival-muted'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREA */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Action & Drift Alert */}
          {driftReport && driftReport.hasBaseline && (
            <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
              driftReport.status === 'DRIFT_DETECTED'
                ? 'bg-archival-warning/10 border-archival-warning/40'
                : 'bg-archival-teal/10 border-archival-teal/40'
            }`}>
              <div className="flex items-center gap-3">
                {driftReport.status === 'DRIFT_DETECTED' ? (
                  <AlertTriangle className="w-5 h-5 text-archival-warning shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-archival-teal shrink-0" />
                )}
                <div>
                  <div className="text-xs font-semibold text-archival-text">
                    Baseline Reference: {driftReport.baseline.code} ({driftReport.baseline.name})
                  </div>
                  <div className="text-xs text-archival-muted mt-0.5">
                    {driftReport.status === 'DRIFT_DETECTED'
                      ? `${driftReport.summary.driftCount} configuration items have drifted away from this baseline.`
                      : 'All tracked configuration items match the baseline state perfectly.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleScanDrift}
                  disabled={scanningDrift}
                  className="px-3 py-1.5 rounded-lg bg-archival-surface hover:bg-archival-elevated border border-archival-border text-xs font-mono text-archival-text transition-colors flex items-center gap-1.5"
                  title="Scan workspace against baseline for configuration drift"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-archival-teal ${scanningDrift ? 'animate-spin' : ''}`} />
                  <span>{scanningDrift ? 'Scanning...' : 'Scan Drift'}</span>
                </button>
                <button
                  onClick={() => {
                    setTab('drift');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-archival-elevated hover:bg-archival-border border border-archival-border text-xs font-mono text-archival-text transition-colors"
                >
                  View Drift Report
                </button>
                {driftReport.status === 'DRIFT_DETECTED' && (
                  <>
                    <button
                      onClick={handleAutoHeal}
                      disabled={healingDrift}
                      className="px-3 py-1.5 rounded-lg bg-archival-teal hover:bg-archival-teal/80 text-archival-bg font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-archival-teal/20"
                      title="Automatically revert all drifted configuration files back to this baseline state"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${healingDrift ? 'animate-spin' : ''}`} />
                      <span>{healingDrift ? 'Auto-Healing...' : '⚡ Auto-Heal to Baseline'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setRollbackTargetRevision(driftReport.baseline.revision);
                        setIsRollbackModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-archival-warning hover:bg-archival-warning/80 text-archival-bg font-semibold text-xs transition-colors"
                    >
                      Restore Baseline
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SCM Workspace Quick Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Recent Configurations */}
            <div className="rounded-xl bg-archival-surface border border-archival-border p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-archival-border">
                <span className="text-xs font-mono uppercase text-archival-teal font-semibold">Tracked Artifacts</span>
                <button onClick={() => setTab('configurations')} className="text-[11px] font-mono text-archival-accent hover:underline">
                  All ({configurations.length})
                </button>
              </div>
              <div className="space-y-2">
                {configurations.slice(0, 5).map(ci => (
                  <div key={ci.id} className="flex items-center justify-between p-2 rounded bg-archival-elevated/70 text-xs font-mono">
                    <span className="text-archival-text">{ci.path}</span>
                    <span className="text-[10px] text-archival-muted">[{ci.current_version?.substring(0, 6)}]</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Baselines */}
            <div className="rounded-xl bg-archival-surface border border-archival-border p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-archival-border">
                <span className="text-xs font-mono uppercase text-archival-warning font-semibold">Configuration Baselines</span>
                <button onClick={() => setTab('baselines')} className="text-[11px] font-mono text-archival-accent hover:underline">
                  All ({baselines.length})
                </button>
              </div>
              <div className="space-y-2">
                {baselines.slice(0, 4).map(b => (
                  <div key={b.id} className="p-2 rounded bg-archival-elevated/70 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-archival-text font-mono">{b.baseline_code}: {b.name}</div>
                      <div className="text-[10px] text-archival-muted font-mono">rev: {b.revision_id?.substring(0, 8)}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-archival-warning/20 text-archival-warning border border-archival-warning/30">
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Evolution Check-ins */}
            <div className="rounded-xl bg-archival-surface border border-archival-border p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-archival-border">
                <span className="text-xs font-mono uppercase text-archival-accent font-semibold">Latest Check-ins</span>
                <button onClick={() => setTab('timeline')} className="text-[11px] font-mono text-archival-accent hover:underline">
                  Timeline
                </button>
              </div>
              <div className="space-y-2">
                {timeline.slice(0, 4).map((t, idx) => (
                  <div key={idx} className="p-2 rounded bg-archival-elevated/70 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-archival-accent font-semibold">[{t.revision?.substring(0, 8)}]</span>
                      <span className="text-archival-muted">{t.time || t.date}</span>
                    </div>
                    <div className="text-archival-text truncate mt-1">{t.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURATIONS */}
      {activeTab === 'configurations' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-archival-text">
                Tracked Configuration Items ({configurations.length})
              </h2>
              <p className="text-[11px] text-archival-muted">
                Workspace: <span className="font-mono text-archival-accent">{project?.workspace_path}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncWorkspace}
                disabled={syncing}
                title="Scan and import all files in the project workspace folder in one step"
                className="px-3 py-1.5 rounded-lg bg-archival-surface hover:bg-archival-elevated border border-archival-border text-archival-text font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-archival-teal ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing Workspace...' : 'Sync Workspace Folder'}</span>
              </button>

              <button
                onClick={() => {
                  setEditingConfigItem(null);
                  setIsConfigModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-archival-teal hover:bg-archival-teal/80 text-archival-bg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Single File</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-archival-surface border border-archival-border overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-archival-elevated text-archival-muted uppercase tracking-wider text-[10px] border-b border-archival-border">
                  <tr>
                    <th className="px-4 py-3">Item Path</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Current Version</th>
                    <th className="px-4 py-3">Last Modified</th>
                    <th className="px-4 py-3">Author</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-archival-border/60">
                  {configurations.map((item) => (
                    <tr key={item.id} className="hover:bg-archival-elevated/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-archival-text flex items-center gap-2">
                        <FileCode2 className="w-4 h-4 text-archival-teal shrink-0" />
                        <span>{item.path}</span>
                      </td>
                      <td className="px-4 py-3 text-archival-muted uppercase">{item.file_type}</td>
                      <td className="px-4 py-3 text-archival-accent font-semibold">[{item.current_version?.substring(0, 10)}]</td>
                      <td className="px-4 py-3 text-archival-muted">{new Date(item.updated_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-archival-text">{item.updated_by}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewConfig(item)}
                            className="p-1.5 rounded hover:bg-archival-elevated text-archival-muted hover:text-archival-teal transition-colors"
                            title="View Content"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              const contentRes = await api.getConfigurationContent(id, item.id);
                              setEditingConfigItem({ ...item, content: contentRes.content });
                              setIsConfigModalOpen(true);
                            }}
                            className="p-1.5 rounded hover:bg-archival-elevated text-archival-muted hover:text-archival-accent transition-colors"
                            title="Edit & Commit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Embedded File Viewer Modal/Drawer */}
          {viewingConfigContent && (
            <div className="rounded-xl bg-archival-surface border border-archival-border p-5 shadow-2xl space-y-3 animate-in fade-in-50">
              <div className="flex items-center justify-between pb-3 border-b border-archival-border">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="font-semibold text-archival-text">{viewingConfigContent.path}</span>
                  <span className="text-archival-accent">[{viewingConfigContent.revision?.substring(0, 10)}]</span>
                </div>
                <button
                  onClick={() => setViewingConfigContent(null)}
                  className="text-xs font-mono text-archival-muted hover:text-archival-text"
                >
                  Close Viewer
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-archival-elevated/70 border border-archival-border text-xs font-mono text-archival-text overflow-x-auto max-h-96">
                {viewingConfigContent.content}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TIMELINE (Interactive Time Machine) */}
      {activeTab === 'timeline' && (
        <TimeMachineScrubber
          revisions={timeline}
          selectedRevision={selectedRevision}
          onSelectRevision={(rev) => setSelectedRevision(rev)}
          onRollback={(rev) => handleTriggerRollback(rev)}
          onMarkBaseline={(rev) => {
            setIsBaselineModalOpen(true);
          }}
        />
      )}

      {/* TAB 4: BASELINES */}
      {activeTab === 'baselines' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-archival-text">Configuration Baselines ({baselines.length})</h2>
              <p className="text-xs text-archival-muted">Approved stable milestones tagged in Fossil SCM</p>
            </div>
            <button
              onClick={() => setIsBaselineModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-archival-warning hover:bg-archival-warning/80 text-archival-bg font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Establish Baseline</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {baselines.map((b) => (
              <div
                key={b.id}
                className="p-5 rounded-xl bg-archival-surface border border-archival-border hover:border-archival-warning/50 shadow-md space-y-3 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-archival-warning">
                        {b.baseline_code}
                      </span>
                      <h3 className="text-sm font-semibold text-archival-text">{b.name}</h3>
                    </div>
                    <div className="text-xs text-archival-muted font-mono mt-0.5">
                      Revision: <span className="text-archival-accent">[{b.revision_id?.substring(0, 10)}]</span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      b.status === 'Active'
                        ? 'bg-archival-success/20 text-archival-success border border-archival-success/40'
                        : b.status === 'Approved'
                        ? 'bg-archival-warning/20 text-archival-warning border border-archival-warning/40'
                        : 'bg-archival-elevated text-archival-muted border border-archival-border'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <p className="text-xs text-archival-muted leading-relaxed">
                  {b.description || 'Formal configuration baseline.'}
                </p>

                <div className="pt-2 border-t border-archival-border/60 flex items-center justify-between text-xs">
                  <span className="text-archival-muted font-mono text-[11px]">
                    Created: {new Date(b.created_at).toLocaleDateString()} by {b.created_by}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTab('compare');
                        setCompareMode('baseline_vs_current');
                        setCompareRefA(b.baseline_code);
                        handleRunCompare(b.baseline_code, null, 'baseline_vs_current');
                      }}
                      className="px-2.5 py-1 rounded bg-archival-elevated hover:bg-archival-border text-[11px] font-mono text-archival-text border border-archival-border transition-colors"
                    >
                      Compare vs Current
                    </button>
                    <button
                      onClick={() => {
                        setRollbackTargetRevision(b.revision_id);
                        setIsRollbackModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-archival-danger/15 hover:bg-archival-danger/25 text-[11px] font-mono text-archival-danger border border-archival-danger/40 transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: DRIFT DETECTION RESULT */}
      {activeTab === 'drift' && (
        <div className="space-y-6">
          {/* Header & Scan Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-archival-surface border border-archival-border shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-archival-warning" />
                <h2 className="text-base font-bold text-archival-text">
                  Configuration Drift Detection Result
                </h2>
              </div>
              <p className="text-xs text-archival-muted mt-1">
                Automated detection of deviations between active configuration items and the approved baseline
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleScanDrift}
                disabled={scanningDrift}
                className="px-3.5 py-2 rounded-lg bg-archival-teal hover:bg-archival-teal/80 text-archival-bg font-bold text-xs transition-colors flex items-center gap-2 shadow-sm shadow-archival-teal/20"
                title="Run immediate drift scan comparing workspace to baseline"
              >
                <RefreshCw className={`w-4 h-4 ${scanningDrift ? 'animate-spin' : ''}`} />
                <span>{scanningDrift ? 'Scanning Drift...' : 'Scan / Detect Drift'}</span>
              </button>

              {driftReport?.status === 'DRIFT_DETECTED' && (
                <button
                  onClick={handleAutoHeal}
                  disabled={healingDrift}
                  className="px-3.5 py-2 rounded-lg bg-archival-warning hover:bg-archival-warning/80 text-archival-bg font-bold text-xs transition-colors flex items-center gap-2 shadow-sm"
                  title="Automatically revert all drifted configuration files back to baseline"
                >
                  <Sparkles className={`w-4 h-4 ${healingDrift ? 'animate-spin' : ''}`} />
                  <span>{healingDrift ? 'Auto-Healing...' : '⚡ Auto-Heal to Baseline'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Baseline Reference & KPI Cards */}
          {driftReport?.hasBaseline ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-archival-surface border border-archival-border">
                <span className="text-[10px] font-mono uppercase text-archival-muted tracking-wider">Active Baseline</span>
                <div className="text-sm font-bold font-mono text-archival-teal mt-1">
                  {driftReport.baseline.code}
                </div>
                <div className="text-[11px] text-archival-muted truncate mt-0.5">
                  {driftReport.baseline.name}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-archival-surface border border-archival-border">
                <span className="text-[10px] font-mono uppercase text-archival-muted tracking-wider">Tracked Items</span>
                <div className="text-lg font-bold font-mono text-archival-text mt-1">
                  {driftReport.summary?.total || 0}
                </div>
                <div className="text-[11px] text-archival-muted mt-0.5">
                  Total monitored items
                </div>
              </div>

              <div className="p-4 rounded-xl bg-archival-surface border border-archival-border">
                <span className="text-[10px] font-mono uppercase text-archival-muted tracking-wider">Drifted Items</span>
                <div className={`text-lg font-bold font-mono mt-1 ${
                  driftReport.summary?.driftCount > 0 ? 'text-archival-warning' : 'text-archival-teal'
                }`}>
                  {driftReport.summary?.driftCount || 0}
                </div>
                <div className="text-[11px] text-archival-muted mt-0.5">
                  {driftReport.summary?.driftCount > 0 ? 'Deviations from baseline' : 'All items in sync'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-archival-surface border border-archival-border">
                <span className="text-[10px] font-mono uppercase text-archival-muted tracking-wider">Integrity Status</span>
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                    driftReport.status === 'DRIFT_DETECTED'
                      ? 'bg-archival-warning/15 border-archival-warning/50 text-archival-warning'
                      : 'bg-archival-teal/15 border-archival-teal/50 text-archival-teal'
                  }`}>
                    {driftReport.status === 'DRIFT_DETECTED' ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>DRIFT DETECTED</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>BASELINE IN SYNC</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="text-[11px] text-archival-muted mt-1">
                  Revision: {driftReport.baseline.revision?.substring(0, 8)}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-archival-surface border border-archival-border text-center">
              <p className="text-xs text-archival-muted">No baseline defined yet. Create a baseline to enable automated drift detection.</p>
            </div>
          )}

          {/* Drift Result Details */}
          {driftReport?.hasBaseline && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-archival-muted">
                  Configuration Items Audit Breakdown
                </h3>
                <span className="text-[11px] text-archival-muted font-mono">
                  {driftReport.summary?.unchanged || 0} unchanged · {driftReport.summary?.modified || 0} modified · {driftReport.summary?.added || 0} added
                </span>
              </div>

              <div className="space-y-3">
                {driftReport.items?.map(item => {
                  const isModified = item.status === 'MODIFIED';
                  const isDeleted = item.status === 'DELETED';
                  const isAdded = item.status === 'ADDED';
                  const isUnchanged = item.status === 'UNCHANGED';

                  return (
                    <div
                      key={item.id || item.path}
                      className={`p-4 rounded-xl border transition-colors ${
                        isModified
                          ? 'bg-archival-warning/10 border-archival-warning/40'
                          : isDeleted
                          ? 'bg-archival-danger/10 border-archival-danger/40'
                          : isAdded
                          ? 'bg-archival-accent/10 border-archival-accent/40'
                          : 'bg-archival-surface border-archival-border'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isModified ? 'bg-archival-warning/20 text-archival-warning' :
                            isDeleted ? 'bg-archival-danger/20 text-archival-danger' :
                            isAdded ? 'bg-archival-accent/20 text-archival-accent' :
                            'bg-archival-elevated text-archival-muted'
                          }`}>
                            <FileCode2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-archival-text">
                                {item.path}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                isModified ? 'bg-archival-warning/20 text-archival-warning border border-archival-warning/40' :
                                isDeleted ? 'bg-archival-danger/20 text-archival-danger border border-archival-danger/40' :
                                isAdded ? 'bg-archival-accent/20 text-archival-accent border border-archival-accent/40' :
                                'bg-archival-teal/15 text-archival-teal border border-archival-teal/30'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-archival-muted mt-0.5">
                              {item.message}
                            </p>
                          </div>
                        </div>

                        {isModified && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setTab('compare');
                                setCompareMode('baseline_vs_current');
                                setCompareRefA(driftReport.baseline.code);
                                handleRunCompare(driftReport.baseline.code, null, 'baseline_vs_current');
                              }}
                              className="px-2.5 py-1 rounded bg-archival-elevated hover:bg-archival-border border border-archival-border text-[11px] font-mono text-archival-text transition-colors"
                            >
                              Inspect Full Diff
                            </button>
                            <button
                              onClick={handleAutoHeal}
                              disabled={healingDrift}
                              className="px-2.5 py-1 rounded bg-archival-teal hover:bg-archival-teal/80 text-archival-bg font-bold text-[11px] transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Revert to Baseline</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Inline Diff Preview for Modified Configuration Items */}
                      {isModified && (item.diff?.hunks || item.diff?.chunks) && (
                        <div className="mt-3 p-3 rounded-lg bg-archival-bg border border-archival-border/80 font-mono text-xs overflow-x-auto">
                          <div className="text-[10px] uppercase text-archival-muted mb-1.5 pb-1 border-b border-archival-border/50">
                            Drift Difference vs Baseline [{driftReport.baseline.code}]
                          </div>
                          {(item.diff.hunks || item.diff.chunks || []).map((hunk, cIdx) => (
                            <div key={cIdx} className="space-y-0.5">
                              {hunk.lines?.map((line, lIdx) => (
                                <div
                                  key={lIdx}
                                  className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-2 ${
                                    line.type === 'add'
                                      ? 'bg-archival-teal/15 text-archival-teal'
                                      : line.type === 'del'
                                      ? 'bg-archival-danger/15 text-archival-danger'
                                      : 'text-archival-muted'
                                  }`}
                                >
                                  <span className="w-3 select-none text-[10px] font-bold">
                                    {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                                  </span>
                                  <span>{line.content}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CHANGES */}
      {activeTab === 'changes' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-archival-text">Configuration Change Control ({changes.length})</h2>
              <p className="text-xs text-archival-muted">Tracked change requests linked with Fossil revisions</p>
            </div>
            <button
              onClick={() => setIsChangeModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-archival-success hover:bg-archival-success/80 text-archival-bg font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Submit CR</span>
            </button>
          </div>

          <div className="rounded-xl bg-archival-surface border border-archival-border overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-archival-elevated text-archival-muted uppercase tracking-wider text-[10px] border-b border-archival-border">
                  <tr>
                    <th className="px-4 py-3">Change Code</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-4 py-3">Related Revision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-archival-border/60">
                  {changes.map((c) => (
                    <tr key={c.id} className="hover:bg-archival-elevated/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-archival-accent">{c.change_code}</td>
                      <td className="px-4 py-3 font-medium text-archival-text">{c.title}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.priority === 'Critical'
                              ? 'text-archival-danger bg-archival-danger/15'
                              : c.priority === 'High'
                              ? 'text-archival-warning bg-archival-warning/15'
                              : 'text-archival-text bg-archival-elevated'
                          }`}
                        >
                          {c.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-archival-teal/15 text-archival-teal border border-archival-teal/30">
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-archival-muted">{c.assigned_to || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-archival-accent">
                        {c.related_revision ? `[${c.related_revision.substring(0, 10)}]` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: COMPARE */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          {/* Compare Control Header */}
          <div className="p-5 rounded-xl bg-archival-surface border border-archival-border shadow-md space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-archival-accent font-semibold">
                  SCM Configuration Comparator
                </h3>
                <p className="text-xs text-archival-muted">Generate exact line-by-line diffs using Fossil SCM engine</p>
              </div>

              {/* Compare Mode Toggles */}
              <div className="flex rounded-lg bg-archival-elevated p-0.5 border border-archival-border text-xs font-mono">
                <button
                  onClick={() => setCompareMode('revisions')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    compareMode === 'revisions' ? 'bg-archival-accent text-archival-bg font-semibold' : 'text-archival-muted'
                  }`}
                >
                  Revision A vs B
                </button>
                <button
                  onClick={() => setCompareMode('baseline_vs_current')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    compareMode === 'baseline_vs_current' ? 'bg-archival-accent text-archival-bg font-semibold' : 'text-archival-muted'
                  }`}
                >
                  Baseline vs Current
                </button>
                <button
                  onClick={() => setCompareMode('baselines')}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    compareMode === 'baselines' ? 'bg-archival-accent text-archival-bg font-semibold' : 'text-archival-muted'
                  }`}
                >
                  Baseline A vs B
                </button>
              </div>
            </div>

            {/* Selector Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-archival-muted uppercase mb-1">
                  Base Reference (Ref A)
                </label>
                {compareMode === 'revisions' ? (
                  <select
                    value={compareRefA}
                    onChange={(e) => setCompareRefA(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text font-mono"
                  >
                    <option value="">Select Revision...</option>
                    {timeline.map((t) => (
                      <option key={t.revision} value={t.revision}>
                        [{t.revision.substring(0, 8)}] {t.message.substring(0, 40)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={compareRefA}
                    onChange={(e) => setCompareRefA(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text font-mono"
                  >
                    <option value="">Select Baseline...</option>
                    {baselines.map((b) => (
                      <option key={b.id} value={b.baseline_code}>
                        {b.baseline_code}: {b.name} [{b.revision_id?.substring(0, 8)}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-mono text-archival-muted uppercase mb-1">
                  Target Reference (Ref B)
                </label>
                {compareMode === 'baseline_vs_current' ? (
                  <div className="px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-muted font-mono">
                    Current Working Checkout (HEAD)
                  </div>
                ) : compareMode === 'revisions' ? (
                  <select
                    value={compareRefB}
                    onChange={(e) => setCompareRefB(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text font-mono"
                  >
                    <option value="">Select Revision...</option>
                    {timeline.map((t) => (
                      <option key={t.revision} value={t.revision}>
                        [{t.revision.substring(0, 8)}] {t.message.substring(0, 40)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={compareRefB}
                    onChange={(e) => setCompareRefB(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text font-mono"
                  >
                    <option value="">Select Baseline...</option>
                    {baselines.map((b) => (
                      <option key={b.id} value={b.baseline_code}>
                        {b.baseline_code}: {b.name} [{b.revision_id?.substring(0, 8)}]
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleRunCompare()}
                disabled={comparing || !compareRefA}
                className="px-4 py-2 rounded-lg bg-archival-accent hover:bg-archival-accent-hover text-archival-bg font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <GitCompare className="w-4 h-4" />
                <span>{comparing ? 'Generating Diff in Fossil...' : 'Compare States'}</span>
              </button>
            </div>
          </div>

          {/* Diff Result Viewer */}
          {compareResult && (
            <DiffViewer
              files={compareResult.files}
              rawUnified={compareResult.unifiedDiff}
              title={`Diff: ${compareResult.refA} ↔ ${compareResult.refB}`}
            />
          )}
        </div>
      )}

      {/* TAB 7: ROLLBACK */}
      {activeTab === 'rollback' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-archival-surface border border-archival-border shadow-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-archival-danger/15 border border-archival-danger/30 flex items-center justify-center text-archival-danger">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-archival-text">SCM Rollback / State Restoration Console</h2>
                <p className="text-xs text-archival-muted">
                  Restore an earlier configuration snapshot or baseline safely through a non-destructive forward check-in
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
                  Select Target Baseline to Restore:
                </label>
                <div className="space-y-2">
                  {baselines.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-lg bg-archival-elevated border border-archival-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-archival-warning font-mono">{b.baseline_code}: </span>
                        <span className="font-medium text-archival-text">{b.name}</span>
                        <div className="text-[10px] text-archival-muted font-mono mt-0.5">
                          rev: [{b.revision_id?.substring(0, 10)}]
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setRollbackTargetRevision(b.revision_id);
                          setIsRollbackModalOpen(true);
                        }}
                        className="px-3 py-1 rounded bg-archival-danger/15 hover:bg-archival-danger/25 text-archival-danger border border-archival-danger/30 font-semibold text-xs transition-colors"
                      >
                        Restore State
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-archival-muted mb-1">
                  Or Restore from Historical Check-in:
                </label>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {timeline.map((t) => (
                    <div
                      key={t.revision}
                      className="p-2.5 rounded-lg bg-archival-elevated border border-archival-border flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-archival-accent font-semibold">[{t.revision.substring(0, 8)}]</span>
                          <span className="text-archival-muted truncate">{t.message}</span>
                        </div>
                        <div className="text-[10px] text-archival-muted mt-0.5">{t.date} by {t.author}</div>
                      </div>
                      <button
                        onClick={() => {
                          setRollbackTargetRevision(t.revision);
                          setIsRollbackModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded bg-archival-elevated hover:bg-archival-border text-archival-muted hover:text-archival-danger border border-archival-border font-mono text-[11px] transition-colors shrink-0"
                      >
                        Rollback
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-archival-text">Configuration Audit Records ({auditLogs.length})</h2>
              <p className="text-xs text-archival-muted">Tamper-evident logs of all SCM and baseline operations</p>
            </div>
          </div>

          <div className="rounded-xl bg-archival-surface border border-archival-border overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-archival-elevated text-archival-muted uppercase tracking-wider text-[10px] border-b border-archival-border">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">SCM Revision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-archival-border/60">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-archival-elevated/40 transition-colors">
                      <td className="px-4 py-3 text-archival-muted">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-archival-teal">{log.action}</td>
                      <td className="px-4 py-3 text-archival-text">{log.target}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-archival-success/15 text-archival-success">
                          {log.result}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-archival-muted">{log.user}</td>
                      <td className="px-4 py-3 text-archival-accent">
                        {log.revision_id ? `[${log.revision_id.substring(0, 10)}]` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewConfigurationModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        projectId={id}
        initialItem={editingConfigItem}
        onSaved={() => fetchProjectData()}
      />

      <NewBaselineModal
        isOpen={isBaselineModalOpen}
        onClose={() => setIsBaselineModalOpen(false)}
        projectId={id}
        currentRevision={project.current_revision}
        onBaselineCreated={() => fetchProjectData()}
      />

      <NewChangeModal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
        projectId={id}
        availableItems={configurations}
        onCreated={() => fetchProjectData()}
      />

      <RollbackModal
        isOpen={isRollbackModalOpen}
        onClose={() => setIsRollbackModalOpen(false)}
        projectId={id}
        currentRevision={project.current_revision}
        targetRevision={rollbackTargetRevision}
        onRollbackComplete={() => fetchProjectData()}
      />

      <ComplianceModal
        isOpen={isComplianceModalOpen}
        onClose={() => setIsComplianceModalOpen(false)}
        projectId={id}
        projectName={project.name}
      />
    </div>
  );
}
