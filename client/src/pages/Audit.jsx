import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, RefreshCw, Terminal, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import ComplianceModal from '../components/modals/ComplianceModal';

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(1);
  const { addToast } = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const [data, projs] = await Promise.all([
        api.getAuditLogs({
          action: actionFilter || undefined,
          user: userFilter || undefined
        }),
        api.getProjects().catch(() => [])
      ]);
      setLogs(data);
      setProjects(projs);
      if (projs.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projs[0].id);
      }
    } catch (err) {
      addToast(err.message, 'error', 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, userFilter]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-archival-text">
            SCM Audit Trail & Integrity Accounting
          </h1>
          <p className="text-xs text-archival-muted mt-0.5">
            Immutable log of all configuration commits, baseline tags, comparisons, drift scans, and rollbacks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsComplianceOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-archival-teal hover:bg-archival-teal/80 text-archival-bg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-archival-teal/20"
            title="Generate SCM compliance certificate"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Compliance Certificate</span>
          </button>

          <button
            onClick={fetchLogs}
            className="p-2 rounded-lg bg-archival-surface hover:bg-archival-elevated border border-archival-border text-archival-muted hover:text-archival-text transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 rounded-xl bg-archival-surface border border-archival-border shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-archival-muted">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text font-mono focus:outline-none focus:border-archival-accent"
          >
            <option value="">All SCM Actions</option>
            <option value="CONFIG_CREATED">CONFIG_CREATED</option>
            <option value="CONFIG_MODIFIED">CONFIG_MODIFIED</option>
            <option value="CONFIG_DELETED">CONFIG_DELETED</option>
            <option value="BASELINE_CREATED">BASELINE_CREATED</option>
            <option value="CONFIGURATION_ROLLBACK">CONFIGURATION_ROLLBACK</option>
            <option value="CHANGE_REQUESTED">CHANGE_REQUESTED</option>
            <option value="CHANGE_STATUS_UPDATED">CHANGE_STATUS_UPDATED</option>
            <option value="PROJECT_CREATED">PROJECT_CREATED</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-archival-muted">User:</span>
          <input
            type="text"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            placeholder="Filter by username..."
            className="px-2.5 py-1.5 rounded-lg bg-archival-elevated border border-archival-border text-xs text-archival-text font-mono focus:outline-none focus:border-archival-accent"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-xl bg-archival-surface border border-archival-border overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-archival-elevated text-archival-muted uppercase tracking-wider text-[10px] border-b border-archival-border">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Repository</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Fossil Revision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-archival-border/60">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-archival-elevated/40 transition-colors">
                  <td className="px-4 py-3 text-archival-muted whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-archival-text font-medium">{log.user}</td>
                  <td className="px-4 py-3 font-semibold text-archival-teal">{log.action}</td>
                  <td className="px-4 py-3 text-archival-muted">{log.project_name || 'System'}</td>
                  <td className="px-4 py-3 text-archival-text">{log.target}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.result === 'Success'
                          ? 'bg-archival-success/15 text-archival-success'
                          : 'bg-archival-danger/15 text-archival-danger'
                      }`}
                    >
                      {log.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-archival-accent">
                    {log.revision_id ? `[${log.revision_id.substring(0, 10)}]` : '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-archival-muted">
                    No audit records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ComplianceModal
        isOpen={isComplianceOpen}
        onClose={() => setIsComplianceOpen(false)}
        projectId={selectedProjectId || (projects[0]?.id || 1)}
        projectName={projects.find(p => p.id === selectedProjectId)?.name || 'SCM Platform'}
      />
    </div>
  );
}
